/**
 * Pure domain calculations — weighted pipeline value, win rate, stage grouping,
 * bid-decision scoring, SBIR assessment scoring, readiness expiry. No I/O, so
 * these are exhaustively unit-tested and reused by services + reports.
 */

import { GovConStage } from "@prisma/client";

/** Stages where the pursuit is still live (counts toward active pipeline). */
export const OPEN_STAGES: GovConStage[] = [
  GovConStage.IDENTIFIED,
  GovConStage.SCREENING,
  GovConStage.QUALIFIED,
  GovConStage.CAPTURE,
  GovConStage.BID_NO_BID,
  GovConStage.PROPOSAL,
  GovConStage.SUBMITTED,
  GovConStage.EVALUATION,
];

/** Stages that count as "qualified pipeline" (past initial screening, pre-close). */
export const QUALIFIED_STAGES: GovConStage[] = [
  GovConStage.QUALIFIED,
  GovConStage.CAPTURE,
  GovConStage.BID_NO_BID,
  GovConStage.PROPOSAL,
  GovConStage.SUBMITTED,
  GovConStage.EVALUATION,
];

export const CLOSED_STAGES: GovConStage[] = [
  GovConStage.AWARDED,
  GovConStage.LOST,
  GovConStage.CANCELED,
  GovConStage.ARCHIVED,
];

/** Canonical ordered pipeline for board columns / conversion. */
export const PIPELINE_ORDER: GovConStage[] = [
  GovConStage.IDENTIFIED,
  GovConStage.SCREENING,
  GovConStage.QUALIFIED,
  GovConStage.CAPTURE,
  GovConStage.BID_NO_BID,
  GovConStage.PROPOSAL,
  GovConStage.SUBMITTED,
  GovConStage.EVALUATION,
  GovConStage.AWARDED,
  GovConStage.LOST,
  GovConStage.CANCELED,
  GovConStage.ARCHIVED,
];

export function isOpenStage(stage: GovConStage): boolean {
  return OPEN_STAGES.includes(stage);
}

export function isClosedStage(stage: GovConStage): boolean {
  return CLOSED_STAGES.includes(stage);
}

/** Coerce a Prisma Decimal | number | null into a finite number (0 when absent). */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  // Prisma.Decimal and strings both have a sensible toString/Number coercion.
  const n = Number(value as { toString(): string });
  return Number.isFinite(n) ? n : 0;
}

/** Clamp a probability to the 0..100 integer range, or null if absent. */
export function clampPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Weighted value = estimated value × PWin. Returns 0 when either input is
 * missing (an unscored pursuit contributes nothing to the weighted forecast).
 */
export function weightedValue(
  estimatedValue: unknown,
  pWin: number | null | undefined,
): number {
  const value = toNumber(estimatedValue);
  const p = clampPercent(pWin);
  if (p === null) return 0;
  return value * (p / 100);
}

/**
 * Stages that constitute the active bid pipeline — a bid decision is live or a
 * price is on the street. Shared by the Active Bids worklist and its rollups.
 */
export const ACTIVE_BID_STAGES: GovConStage[] = [
  GovConStage.BID_NO_BID,
  GovConStage.PROPOSAL,
  GovConStage.SUBMITTED,
  GovConStage.EVALUATION,
];

/**
 * Contingent exposure = the priced-but-unelected headroom above the basis of
 * bid (max − estimated). On MacTech's sub-bids this is the sum of the adders and
 * alternates that are quoted but not yet triggered — the amount the bid could
 * still grow by without a re-bid. Returns 0 when max is absent or below
 * estimated, so it never reports negative headroom.
 */
export function contingentExposure(estimatedValue: unknown, maxValue: unknown): number {
  const estimated = toNumber(estimatedValue);
  const max = toNumber(maxValue);
  if (max <= estimated) return 0;
  return max - estimated;
}

/**
 * Whole days from `now` until `date`, floored toward the past: negative when
 * overdue, 0 on the due day. Null-safe so callers can pass an optional deadline.
 * Both sides are normalised to UTC midnight so the count is calendar days, not
 * elapsed hours — "in 1d" should not flip to "in 0d" because of the clock.
 */
export function daysUntil(date: Date | null | undefined, now: Date = new Date()): number | null {
  if (!date) return null;
  const DAY = 24 * 60 * 60 * 1000;
  const toUtcMidnight = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((toUtcMidnight(date) - toUtcMidnight(now)) / DAY);
}

export interface PipelineStageRollup {
  stage: GovConStage;
  count: number;
  totalValue: number;
  weightedValue: number;
}

/** Roll up opportunities into per-stage totals in canonical pipeline order. */
export function rollupByStage(
  opps: Array<{ stage: GovConStage; estimatedValue: unknown; pWin: number | null }>,
): PipelineStageRollup[] {
  const map = new Map<GovConStage, PipelineStageRollup>();
  for (const stage of PIPELINE_ORDER) {
    map.set(stage, { stage, count: 0, totalValue: 0, weightedValue: 0 });
  }
  for (const opp of opps) {
    const row = map.get(opp.stage);
    if (!row) continue;
    row.count += 1;
    row.totalValue += toNumber(opp.estimatedValue);
    row.weightedValue += weightedValue(opp.estimatedValue, opp.pWin);
  }
  return PIPELINE_ORDER.map((s) => map.get(s)!);
}

/**
 * Win rate over decided pursuits = awarded / (awarded + lost). Returns null when
 * there are no decided pursuits (avoids a misleading 0%).
 */
export function winRate(awarded: number, lost: number): number | null {
  const decided = awarded + lost;
  if (decided === 0) return null;
  return awarded / decided;
}

// --- Bid / no-bid weighted scoring -----------------------------------------

export interface BidCriterion {
  key: string;
  weight: number; // relative weight, >= 0
  score: number; // 0..max
  max?: number; // default 5
}

export interface BidScoreResult {
  weightedScore: number; // 0..maxScore, on the same scale as maxScore
  maxScore: number;
  /** Normalised 0..100 for display; null if no criteria weighted. */
  percent: number | null;
}

/**
 * Weighted bid score. The score never *makes* the decision — services record it
 * alongside the human decision; this only computes the number.
 */
export function scoreBidDecision(criteria: BidCriterion[]): BidScoreResult {
  let weightedScore = 0;
  let maxScore = 0;
  for (const c of criteria) {
    const max = c.max ?? 5;
    const weight = Math.max(0, c.weight);
    weightedScore += weight * clampScore(c.score, max);
    maxScore += weight * max;
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    weightedScore: round2(weightedScore),
    maxScore: round2(maxScore),
    percent: maxScore > 0 ? round2((weightedScore / maxScore) * 100) : null,
  };
}

function clampScore(score: number, max: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(max, score));
}

// --- SBIR assessment scoring -----------------------------------------------

/** Weight of each SBIR scorecard criterion (0..5 scale). */
export const SBIR_CRITERIA_WEIGHTS: Record<string, number> = {
  missionAlignment: 3,
  technicalNovelty: 3,
  feasibility: 3,
  existingIp: 2,
  piAvailability: 2,
  commercialization: 3,
  phaseIiiPathway: 2,
  transitionSponsor: 2,
  pastPerformance: 2,
  teamCompleteness: 2,
  timeRemaining: 1,
  proposalEffort: 1, // lower effort is better; caller should invert if desired
  competitiveIntensity: 1,
};

export interface SbirScoreResult {
  weightedScore: number; // 0..100 normalised
  filledCriteria: number;
}

/** Weighted SBIR fit score normalised to 0..100 over the criteria provided. */
export function scoreSbirAssessment(
  values: Partial<Record<keyof typeof SBIR_CRITERIA_WEIGHTS, number | null | undefined>>,
): SbirScoreResult {
  let weighted = 0;
  let maxWeighted = 0;
  let filled = 0;
  for (const [key, weight] of Object.entries(SBIR_CRITERIA_WEIGHTS)) {
    const raw = values[key as keyof typeof SBIR_CRITERIA_WEIGHTS];
    if (raw === null || raw === undefined) continue;
    filled += 1;
    weighted += weight * clampScore(raw, 5);
    maxWeighted += weight * 5;
  }
  const percent = maxWeighted > 0 ? (weighted / maxWeighted) * 100 : 0;
  return { weightedScore: Math.round(percent * 100) / 100, filledCriteria: filled };
}

// --- Readiness expiry -------------------------------------------------------

export type ReadinessExpiryState = "expired" | "expiring_soon" | "ok" | "none";

/**
 * Classify a readiness item's expiry relative to `now` and its lead time.
 * Pure and deterministic (caller supplies `now`).
 */
export function readinessExpiryState(
  expirationDate: Date | null | undefined,
  leadDays: number | null | undefined,
  now: Date,
): ReadinessExpiryState {
  if (!expirationDate) return "none";
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.floor((expirationDate.getTime() - now.getTime()) / msPerDay);
  if (daysUntil < 0) return "expired";
  if (daysUntil <= (leadDays ?? 30)) return "expiring_soon";
  return "ok";
}
