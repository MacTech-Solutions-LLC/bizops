import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError } from "@/lib/errors";
import { createOpportunity } from "@/lib/services/opportunities";
import {
  getBidDecision,
  recordDecision,
  submitReview,
  upsertBidDecisionCriteria,
} from "@/lib/services/bid-decisions";
import { defaultBidCriteria } from "@/lib/domain/bid-criteria";

const TENANT_A = `test_bid_a_${process.pid}`;
const TENANT_B = `test_bid_b_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });
const adminB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: "user_b_admin" });

// Reviewer: can review but NOT approve/record a final decision.
const reviewerA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_reviewer",
  roles: ["govcon_reviewer"],
  permissions: new Set([
    GOVCON_PERMISSIONS.GOVCON_VIEW,
    GOVCON_PERMISSIONS.GOVCON_BID_DECISION_REVIEW,
  ]),
});

async function cleanup() {
  for (const t of [TENANT_A, TENANT_B]) {
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConOpportunityStageHistory.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConOpportunity.deleteMany({ where: { hubOrganizationId: t } });
  }
}

describe("bid decision service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("recording a final decision requires GOVCON_BID_DECISION_APPROVE", async () => {
    const opp = await createOpportunity(adminA, { internalName: "Bid Approve Gate", stage: "BID_NO_BID" });
    // Reviewer (no approve permission) is rejected.
    await assert.rejects(
      () => recordDecision(reviewerA, opp.id, { outcome: "BID", rationale: "looks good" }),
      (err: unknown) => err instanceof AuthzError,
    );
    // Admin with approve permission succeeds.
    const decided = await recordDecision(adminA, opp.id, { outcome: "NO_BID", rationale: "no path to win" });
    assert.equal(decided.outcome, "NO_BID");
    assert.equal(decided.decidedBy, "user_a_admin");
    assert.ok(decided.decidedAt);
  });

  test("weighted score is advisory: outcome is only what the human passes, never auto-derived", async () => {
    const opp = await createOpportunity(adminA, { internalName: "Advisory Score", stage: "BID_NO_BID" });
    // Score every criterion to the max — a strong "bid" signal.
    const strong = defaultBidCriteria().map((c) => ({ ...c, score: 5 }));
    const scored = await upsertBidDecisionCriteria(reviewerA, opp.id, strong);
    assert.ok(scored.weightedScore, "weighted score should be computed");
    assert.equal(Number(scored.weightedScore), Number(scored.maxScore));
    // Despite a perfect score, no outcome is set automatically.
    assert.equal(scored.outcome, "PENDING");

    // The human deliberately records NO_BID against the strong score — the
    // service must store exactly what was passed.
    const decided = await recordDecision(adminA, opp.id, { outcome: "NO_BID", rationale: "strategic" });
    assert.equal(decided.outcome, "NO_BID");
    // Advisory score is preserved and unchanged.
    assert.equal(Number(decided.weightedScore), Number(scored.maxScore));
  });

  test("submitReview upserts one row per reviewer", async () => {
    const opp = await createOpportunity(adminA, { internalName: "Review Upsert", stage: "BID_NO_BID" });
    await submitReview(adminA, opp.id, { reviewerId: "rev_1", vote: "BID", approved: true });
    await submitReview(adminA, opp.id, { reviewerId: "rev_1", vote: "NO_BID", approved: false, comments: "changed mind" });
    await submitReview(adminA, opp.id, { reviewerId: "rev_2", vote: "HOLD" });

    const decision = await getBidDecision(adminA, opp.id);
    assert.ok(decision);
    assert.equal(decision!.reviews.length, 2, "two distinct reviewers → two rows");
    const rev1 = decision!.reviews.find((r) => r.reviewerId === "rev_1");
    assert.equal(rev1?.vote, "NO_BID");
    assert.equal(rev1?.approved, false);
  });

  test("tenant isolation: B cannot read or decide on A's opportunity", async () => {
    const opp = await createOpportunity(adminA, { internalName: "Bid Isolation", stage: "BID_NO_BID" });
    await recordDecision(adminA, opp.id, { outcome: "BID" });
    await assert.rejects(() => getBidDecision(adminB, opp.id));
    await assert.rejects(() => recordDecision(adminB, opp.id, { outcome: "NO_BID" }));
  });
});
