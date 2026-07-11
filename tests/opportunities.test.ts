import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  archiveOpportunity,
  changeStage,
  createOpportunity,
  getDashboardData,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
} from "@/lib/services/opportunities";

// Unique tenant per run so tests never collide with seed data or each other.
const TENANT_A = `test_org_a_${process.pid}`;
const TENANT_B = `test_org_b_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });
const adminB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: "user_b_admin" });
const viewerA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_viewer",
  roles: ["govcon_viewer"],
  permissions: new Set([GOVCON_PERMISSIONS.GOVCON_VIEW, GOVCON_PERMISSIONS.GOVCON_PIPELINE_VIEW]),
});
const noFinanceA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_contrib",
  roles: ["govcon_contributor"],
  permissions: new Set([
    GOVCON_PERMISSIONS.GOVCON_VIEW,
    GOVCON_PERMISSIONS.GOVCON_CREATE,
    GOVCON_PERMISSIONS.GOVCON_EDIT,
  ]),
});

async function cleanup() {
  for (const t of [TENANT_A, TENANT_B]) {
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConOpportunityStageHistory.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConOpportunity.deleteMany({ where: { hubOrganizationId: t } });
  }
}

describe("opportunity service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("create requires GOVCON_CREATE and writes stage history + audit", async () => {
    const created = await createOpportunity(adminA, {
      internalName: "Test Pursuit One",
      stage: "IDENTIFIED",
      estimatedValue: 1_000_000,
      pWin: 40,
    });
    assert.equal(created.hubOrganizationId, TENANT_A);
    assert.equal(created.internalName, "Test Pursuit One");
    assert.equal(created.createdBy, "user_a_admin");

    const history = await prisma.govConOpportunityStageHistory.findMany({
      where: { opportunityId: created.id },
    });
    assert.equal(history.length, 1);
    assert.equal(history[0].toStage, "IDENTIFIED");

    const activity = await prisma.govConActivityEvent.findMany({
      where: { entityId: created.id, action: "opportunity.created" },
    });
    assert.equal(activity.length, 1);
    assert.equal(activity[0].actorId, "user_a_admin");
  });

  test("viewer cannot create (AuthzError)", async () => {
    await assert.rejects(
      () => createOpportunity(viewerA, { internalName: "Nope" }),
      (err: unknown) => err instanceof AuthzError,
    );
  });

  test("validation failure surfaces as ValidationError", async () => {
    await assert.rejects(
      () => createOpportunity(adminA, { internalName: "" }),
      (err: unknown) => err instanceof ValidationError,
    );
  });

  test("tenant isolation: B cannot read A's opportunity", async () => {
    const created = await createOpportunity(adminA, { internalName: "A-only pursuit" });
    // A can read
    const readByA = await getOpportunity(adminA, created.id);
    assert.equal(readByA.id, created.id);
    // B cannot
    await assert.rejects(
      () => getOpportunity(adminB, created.id),
      (err: unknown) => err instanceof NotFoundError,
    );
    // list is scoped
    const listB = await listOpportunities(adminB, {});
    assert.equal(listB.items.some((o) => o.id === created.id), false);
  });

  test("financial edit requires GOVCON_FINANCIAL_EDIT", async () => {
    const created = await createOpportunity(adminA, { internalName: "Finance test" });
    // Contributor without financial permission editing a financial field is rejected.
    await assert.rejects(
      () => updateOpportunity(noFinanceA, created.id, { estimatedValue: 5_000_000 }),
      (err: unknown) => err instanceof AuthzError,
    );
    // Non-financial edit is allowed for the contributor.
    const ok = await updateOpportunity(noFinanceA, created.id, { winThemes: "Speed to value" });
    assert.equal(ok.winThemes, "Speed to value");
    // Admin can edit financials.
    const withMoney = await updateOpportunity(adminA, created.id, { estimatedValue: 5_000_000 });
    assert.equal(Number(withMoney.estimatedValue), 5_000_000);
  });

  test("optimistic concurrency: stale version → ConflictError", async () => {
    const created = await createOpportunity(adminA, { internalName: "Concurrency test" });
    await updateOpportunity(adminA, created.id, { winThemes: "v1" }); // bumps version to 1
    await assert.rejects(
      () => updateOpportunity(adminA, created.id, { winThemes: "stale", expectedVersion: 0 }),
      (err: unknown) => err instanceof ConflictError,
    );
  });

  test("changeStage records history + audit and advances stage", async () => {
    const created = await createOpportunity(adminA, { internalName: "Stage test", stage: "IDENTIFIED" });
    const moved = await changeStage(adminA, created.id, { stage: "QUALIFIED", note: "Screened in" });
    assert.equal(moved.stage, "QUALIFIED");
    const history = await prisma.govConOpportunityStageHistory.findMany({
      where: { opportunityId: created.id },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(history.at(-1)?.toStage, "QUALIFIED");
    assert.equal(history.at(-1)?.fromStage, "IDENTIFIED");
    const audit = await prisma.govConActivityEvent.findMany({
      where: { entityId: created.id, action: "opportunity.stage_changed" },
    });
    assert.equal(audit.length, 1);
  });

  test("archive requires GOVCON_ARCHIVE and soft-archives", async () => {
    const created = await createOpportunity(adminA, { internalName: "Archive test" });
    await assert.rejects(
      () => archiveOpportunity(noFinanceA, created.id),
      (err: unknown) => err instanceof AuthzError,
    );
    const archived = await archiveOpportunity(adminA, created.id);
    assert.equal(archived.stage, "ARCHIVED");
    assert.ok(archived.archivedAt);
    // Archived rows are excluded from the default list.
    const list = await listOpportunities(adminA, {});
    assert.equal(list.items.some((o) => o.id === created.id), false);
    const listArchived = await listOpportunities(adminA, { includeArchived: true });
    assert.equal(listArchived.items.some((o) => o.id === created.id), true);
  });

  test("dashboard KPIs reflect tenant data and weighted value", async () => {
    await cleanup();
    await createOpportunity(adminA, {
      internalName: "Dash A1",
      stage: "PROPOSAL",
      estimatedValue: 2_000_000,
      pWin: 50,
      health: "AT_RISK",
    });
    await createOpportunity(adminA, {
      internalName: "Dash A2",
      stage: "QUALIFIED",
      estimatedValue: 1_000_000,
      pWin: 10,
    });
    const dash = await getDashboardData(adminA);
    // weighted = 2M*0.5 + 1M*0.1 = 1.1M
    assert.equal(dash.kpis.weightedPipeline, 1_100_000);
    assert.equal(dash.kpis.activePursuits, 2);
    assert.equal(dash.kpis.atRiskPursuits, 1);
    // B's dashboard sees nothing from A.
    const dashB = await getDashboardData(adminB);
    assert.equal(dashB.kpis.activePursuits, 0);
  });
});
