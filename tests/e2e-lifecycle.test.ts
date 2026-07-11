import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import {
  changeStage,
  createOpportunity,
  getDashboardData,
  getOpportunity,
  updateOpportunity,
} from "@/lib/services/opportunities";
import { createMilestone } from "@/lib/services/milestones";
import { listActivity } from "@/lib/services/activity";

/**
 * End-to-end happy path through the service layer (the equivalent of: sign in →
 * resolve org → dashboard → create opportunity → assign owner → add milestone →
 * change stage → record activity → confirm dashboard update). Real Clerk sign-in
 * is exercised manually; this proves the full domain flow is wired and audited.
 */
const TENANT = `test_e2e_${process.pid}`;
const ctx = makeGovConContext({ tenantOrgId: TENANT, actorHubUserId: "e2e_user" });

async function cleanup() {
  await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: TENANT } });
  await prisma.govConMilestone.deleteMany({ where: { hubOrganizationId: TENANT } });
  await prisma.govConOpportunityStageHistory.deleteMany({ where: { hubOrganizationId: TENANT } });
  await prisma.govConOpportunity.deleteMany({ where: { hubOrganizationId: TENANT } });
}

describe("e2e pursuit lifecycle", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("create → assign owner → add milestone → change stage → activity → dashboard", async () => {
    // Baseline dashboard is empty.
    const before = await getDashboardData(ctx);
    assert.equal(before.kpis.activePursuits, 0);

    // 1. Create opportunity.
    const created = await createOpportunity(ctx, {
      internalName: "E2E — Agency Cloud Recompete",
      stage: "QUALIFIED",
      estimatedValue: 4_000_000,
      pWin: 50,
      health: "ON_TRACK",
    });

    // 2. Assign capture owner (update).
    const owned = await updateOpportunity(ctx, created.id, { captureOwnerId: "capture_lead_1" });
    assert.equal(owned.captureOwnerId, "capture_lead_1");

    // 3. Add a milestone.
    const milestone = await createMilestone(ctx, {
      opportunityId: created.id,
      title: "Pink Team Review",
      type: "PINK_TEAM",
      dueAt: new Date(Date.now() + 7 * 864e5),
    });
    assert.equal(milestone.opportunityId, created.id);

    // 4. Change stage.
    const moved = await changeStage(ctx, created.id, { stage: "PROPOSAL", note: "Bid approved" });
    assert.equal(moved.stage, "PROPOSAL");

    // 5. Activity recorded for each material step.
    const activity = await listActivity(ctx, { opportunityId: created.id, limit: 20 });
    const actions = activity.map((a) => a.action);
    assert.ok(actions.includes("opportunity.created"));
    assert.ok(actions.includes("opportunity.updated"));
    assert.ok(actions.includes("milestone.created"));
    assert.ok(actions.includes("opportunity.stage_changed"));

    // 6. Detail read returns the fully-wired record with milestone.
    const detail = await getOpportunity(ctx, created.id);
    assert.equal(detail.milestones.length, 1);
    assert.equal(detail.stage, "PROPOSAL");

    // 7. Dashboard reflects the new pursuit + weighted value (4M × 50% = 2M).
    const after = await getDashboardData(ctx);
    assert.equal(after.kpis.activePursuits, 1);
    assert.equal(after.kpis.weightedPipeline, 2_000_000);
  });
});
