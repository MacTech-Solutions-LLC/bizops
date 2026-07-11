/**
 * Fixed bid / no-bid scorecard criteria. Plain data (no Prisma import) so the
 * client scorecard and the server service share one source of truth. Each
 * criterion is scored 0..5 by a human; `weight` is its relative importance in
 * the advisory weighted total. The score NEVER makes the decision — a human
 * records the outcome; the weighted number is guidance only.
 */

export interface BidCriterionDef {
  key: string;
  label: string;
  /** Relative weight (>= 0) in the weighted total. */
  weight: number;
  /** Grouping for display. */
  group: string;
  hint?: string;
}

/** The 16 canonical bid-decision criteria, grouped for the scorecard UI. */
export const BID_CRITERIA: BidCriterionDef[] = [
  { key: "strategicAlignment", label: "Strategic alignment", weight: 3, group: "Fit & Strategy", hint: "Alignment with growth strategy and core markets." },
  { key: "customerAccess", label: "Customer access", weight: 3, group: "Fit & Strategy", hint: "Relationship depth and access to the customer." },
  { key: "requirementUnderstanding", label: "Requirement understanding", weight: 3, group: "Fit & Strategy", hint: "How well we understand the requirement." },
  { key: "technicalFit", label: "Technical fit", weight: 3, group: "Solution & Team", hint: "Match of our solution to the technical scope." },
  { key: "relevantPastPerformance", label: "Relevant past performance", weight: 3, group: "Solution & Team", hint: "Directly relevant, recent past performance." },
  { key: "personnelAvailability", label: "Personnel availability", weight: 2, group: "Solution & Team", hint: "Key personnel available to staff." },
  { key: "teamingCompleteness", label: "Teaming completeness", weight: 2, group: "Solution & Team", hint: "Team is complete with required capabilities." },
  { key: "priceCompetitiveness", label: "Price competitiveness", weight: 3, group: "Commercial", hint: "Ability to price competitively and win." },
  { key: "revenuePotential", label: "Revenue potential", weight: 2, group: "Commercial", hint: "Size and strategic value of the award." },
  { key: "pWin", label: "Probability of win (PWin)", weight: 3, group: "Commercial", hint: "Assessed likelihood of winning." },
  { key: "complianceFeasibility", label: "Compliance feasibility", weight: 2, group: "Feasibility", hint: "Ability to meet compliance requirements." },
  { key: "vehicleAccess", label: "Vehicle access", weight: 2, group: "Feasibility", hint: "Access to the required contract vehicle." },
  { key: "proposalCapacity", label: "Proposal capacity", weight: 2, group: "Feasibility", hint: "Bandwidth to produce a winning proposal." },
  { key: "deliveryRisk", label: "Delivery risk", weight: 2, group: "Risk", hint: "Higher score = lower delivery risk." },
  { key: "organizationalConflict", label: "Organizational conflict", weight: 1, group: "Risk", hint: "Higher score = fewer organizational conflicts." },
  { key: "ociRisk", label: "OCI risk", weight: 1, group: "Risk", hint: "Higher score = lower organizational conflict of interest risk." },
];

/** Max score any single criterion can receive. */
export const BID_CRITERION_MAX = 5;

export const BID_CRITERIA_KEYS: string[] = BID_CRITERIA.map((c) => c.key);

/** Default criteria list (score 0, default weights) for a fresh scorecard. */
export function defaultBidCriteria(): Array<{ key: string; weight: number; score: number; max: number }> {
  return BID_CRITERIA.map((c) => ({ key: c.key, weight: c.weight, score: 0, max: BID_CRITERION_MAX }));
}

/** Merge stored per-criterion scores/weights onto the canonical criteria list. */
export function mergeBidCriteria(
  stored: Array<{ key: string; weight?: number; score?: number; max?: number }> | null | undefined,
): Array<{ key: string; label: string; group: string; hint?: string; weight: number; score: number; max: number }> {
  const byKey = new Map((stored ?? []).map((c) => [c.key, c]));
  return BID_CRITERIA.map((def) => {
    const s = byKey.get(def.key);
    return {
      key: def.key,
      label: def.label,
      group: def.group,
      hint: def.hint,
      weight: s?.weight ?? def.weight,
      score: clamp(s?.score ?? 0),
      max: s?.max ?? BID_CRITERION_MAX,
    };
  });
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(BID_CRITERION_MAX, n));
}
