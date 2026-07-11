import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, ConflictError } from "@/lib/errors";
import { createOpportunity } from "@/lib/services/opportunities";
import {
  addCaptureSection,
  getCapturePlanForOpportunity,
  updateCaptureSection,
  upsertCapturePlan,
} from "@/lib/services/capture";

const TENANT_A = `test_cap_a_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });

// Viewer: read only, no capture-manage.
const viewerA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_viewer",
  roles: ["govcon_viewer"],
  permissions: new Set([GOVCON_PERMISSIONS.GOVCON_VIEW]),
});

async function cleanup() {
  await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: TENANT_A } });
  await prisma.govConOpportunityStageHistory.deleteMany({ where: { hubOrganizationId: TENANT_A } });
  await prisma.govConOpportunity.deleteMany({ where: { hubOrganizationId: TENANT_A } });
}

describe("capture service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("capture upsert requires GOVCON_CAPTURE_MANAGE and writes audit", async () => {
    const opp = await createOpportunity(adminA, { internalName: "Capture Perms", stage: "CAPTURE" });
    // Viewer cannot write the plan.
    await assert.rejects(
      () => upsertCapturePlan(viewerA, opp.id, { customerMission: "hack" }),
      (err: unknown) => err instanceof AuthzError,
    );
    // Admin can.
    const plan = await upsertCapturePlan(adminA, opp.id, {
      customerMission: "Defend the network",
      winThemes: "Speed, security, scale",
    });
    assert.equal(plan.customerMission, "Defend the network");

    const audit = await prisma.govConActivityEvent.findMany({
      where: { entityId: plan.id, action: "capture.updated" },
    });
    assert.ok(audit.length >= 1, "capture.updated audit row written");
  });

  test("getCapturePlanForOpportunity creates on first access", async () => {
    const opp = await createOpportunity(adminA, { internalName: "Capture Create", stage: "CAPTURE" });
    const plan = await getCapturePlanForOpportunity(adminA, opp.id);
    assert.ok(plan);
    assert.equal(plan!.opportunityId, opp.id);
  });

  test("a LOCKED section rejects body edits until unlocked", async () => {
    const opp = await createOpportunity(adminA, { internalName: "Capture Lock", stage: "CAPTURE" });
    const section = await addCaptureSection(adminA, opp.id, { title: "Win strategy", body: "draft" });

    // Lock it.
    const locked = await updateCaptureSection(adminA, opp.id, section.id, { status: "LOCKED" });
    assert.equal(locked.status, "LOCKED");
    assert.ok(locked.lockedAt);

    // A body edit on a locked section is rejected.
    await assert.rejects(
      () => updateCaptureSection(adminA, opp.id, section.id, { body: "sneaky edit" }),
      (err: unknown) => err instanceof ConflictError,
    );

    // Explicit unlock (with capture-manage) is allowed, then the edit works.
    const unlocked = await updateCaptureSection(adminA, opp.id, section.id, { unlock: true, body: "revised" });
    assert.equal(unlocked.status, "APPROVED");
    assert.equal(unlocked.body, "revised");
    assert.equal(unlocked.lockedAt, null);

    // Approve sets approvedBy/approvedAt.
    const approved = await updateCaptureSection(adminA, opp.id, section.id, { status: "APPROVED" });
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.approvedBy, "user_a_admin");
    assert.ok(approved.approvedAt);
  });
});
