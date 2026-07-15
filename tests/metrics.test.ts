import assert from "node:assert/strict";
import { test } from "node:test";
import { GovConStage } from "@prisma/client";
import {
  ACTIVE_BID_STAGES,
  contingentExposure,
  daysUntil,
  isClosedStage,
  isOpenStage,
  readinessExpiryState,
  rollupByStage,
  scoreBidDecision,
  scoreSbirAssessment,
  toNumber,
  weightedValue,
  winRate,
} from "@/lib/domain/metrics";

test("weightedValue = value × pWin/100; 0 when pWin missing", () => {
  assert.equal(weightedValue(1_000_000, 40), 400_000);
  assert.equal(weightedValue(1_000_000, null), 0);
  assert.equal(weightedValue(null, 40), 0);
  // clamps out-of-range pWin
  assert.equal(weightedValue(100, 250), 100);
});

test("contingentExposure = max − estimated, never negative", () => {
  // Shape: a basis of bid plus priced-but-unelected adders quoted above it.
  assert.equal(contingentExposure(500_000, 600_000), 100_000);
  // No headroom quoted — max absent or equal to the basis.
  assert.equal(contingentExposure(500_000, null), 0);
  assert.equal(contingentExposure(500_000, 500_000), 0);
  // A max below the basis is nonsense; report no headroom rather than negative.
  assert.equal(contingentExposure(500_000, 400_000), 0);
});

test("daysUntil counts calendar days and is null-safe", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  assert.equal(daysUntil(new Date("2026-07-30T12:00:00.000Z"), now), 16);
  assert.equal(daysUntil(new Date("2026-07-14T12:00:00.000Z"), now), 0);
  assert.equal(daysUntil(new Date("2026-06-22T12:00:00.000Z"), now), -22);
  assert.equal(daysUntil(null, now), null);
});

test("daysUntil counts whole days regardless of time of day", () => {
  // Late-evening "now" must not shave a day off the count: a deadline stored at
  // noon UTC is one calendar day away whether it is 00:01 or 23:59 right now.
  const early = new Date("2026-07-29T00:01:00.000Z");
  const late = new Date("2026-07-29T23:59:00.000Z");
  const due = new Date("2026-07-30T12:00:00.000Z");
  assert.equal(daysUntil(due, early), 1);
  assert.equal(daysUntil(due, late), 1);
});

test("ACTIVE_BID_STAGES is exactly the stages with a live price", () => {
  // Compare a copy: assert.deepEqual carries an `asserts actual is T` signature,
  // so passing the const itself would narrow it to this literal tuple and make
  // the `includes` checks below unrepresentable.
  assert.deepEqual([...ACTIVE_BID_STAGES], [
    GovConStage.BID_NO_BID,
    GovConStage.PROPOSAL,
    GovConStage.SUBMITTED,
    GovConStage.EVALUATION,
  ]);
  // A pursuit still in capture has no price out; an awarded one is no longer a bid.
  assert.ok(!ACTIVE_BID_STAGES.includes(GovConStage.CAPTURE));
  assert.ok(!ACTIVE_BID_STAGES.includes(GovConStage.AWARDED));
  assert.ok(!ACTIVE_BID_STAGES.includes(GovConStage.LOST));
});

test("toNumber coerces Decimal-like, number, null", () => {
  assert.equal(toNumber(null), 0);
  assert.equal(toNumber(42), 42);
  assert.equal(toNumber({ toString: () => "12.50" }), 12.5);
});

test("stage predicates partition open vs closed", () => {
  assert.equal(isOpenStage(GovConStage.PROPOSAL), true);
  assert.equal(isClosedStage(GovConStage.AWARDED), true);
  assert.equal(isOpenStage(GovConStage.LOST), false);
});

test("rollupByStage returns all stages in canonical order with totals", () => {
  const rows = rollupByStage([
    { stage: GovConStage.PROPOSAL, estimatedValue: 1_000_000, pWin: 50 },
    { stage: GovConStage.PROPOSAL, estimatedValue: 2_000_000, pWin: 25 },
    { stage: GovConStage.QUALIFIED, estimatedValue: 500_000, pWin: 10 },
  ]);
  assert.equal(rows.length, 12);
  const proposal = rows.find((r) => r.stage === GovConStage.PROPOSAL)!;
  assert.equal(proposal.count, 2);
  assert.equal(proposal.totalValue, 3_000_000);
  assert.equal(proposal.weightedValue, 1_000_000); // 500k + 500k
});

test("winRate is null with no decided pursuits, else fraction", () => {
  assert.equal(winRate(0, 0), null);
  assert.equal(winRate(3, 1), 0.75);
});

test("scoreBidDecision computes weighted score + percent; never decides", () => {
  const result = scoreBidDecision([
    { key: "fit", weight: 2, score: 4, max: 5 },
    { key: "pwin", weight: 1, score: 3, max: 5 },
  ]);
  assert.equal(result.maxScore, 15); // 2*5 + 1*5
  assert.equal(result.weightedScore, 11); // 2*4 + 1*3
  assert.ok(result.percent !== null && Math.abs(result.percent - 73.33) < 0.01);
});

test("scoreSbirAssessment normalises to 0..100 over filled criteria", () => {
  const empty = scoreSbirAssessment({});
  assert.equal(empty.filledCriteria, 0);
  assert.equal(empty.weightedScore, 0);
  const strong = scoreSbirAssessment({ missionAlignment: 5, feasibility: 5 });
  assert.equal(strong.filledCriteria, 2);
  assert.equal(strong.weightedScore, 100);
});

test("readinessExpiryState classifies by lead time", () => {
  const now = new Date("2026-07-10T00:00:00Z");
  assert.equal(readinessExpiryState(null, 30, now), "none");
  assert.equal(readinessExpiryState(new Date("2026-06-01T00:00:00Z"), 30, now), "expired");
  assert.equal(readinessExpiryState(new Date("2026-07-20T00:00:00Z"), 30, now), "expiring_soon");
  assert.equal(readinessExpiryState(new Date("2026-12-01T00:00:00Z"), 30, now), "ok");
});
