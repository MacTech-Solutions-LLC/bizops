import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError } from "@/lib/errors";
import { readinessExpiryState } from "@/lib/domain/metrics";
import {
  createReadinessItem,
  getExpiringItems,
  listReadiness,
} from "@/lib/services/readiness";

const TENANT_A = `test_ready_a_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });
const viewerA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_viewer",
  roles: ["govcon_viewer"],
  permissions: new Set([GOVCON_PERMISSIONS.GOVCON_VIEW]),
});

const NOW = new Date("2026-07-10T00:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

async function cleanup() {
  await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: TENANT_A } });
  await prisma.govConReadinessItem.deleteMany({ where: { hubOrganizationId: TENANT_A } });
}

describe("readiness service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("expiry state classification is deterministic", () => {
    assert.equal(readinessExpiryState(new Date(NOW.getTime() - day), 30, NOW), "expired");
    assert.equal(readinessExpiryState(new Date(NOW.getTime() + 10 * day), 30, NOW), "expiring_soon");
    assert.equal(readinessExpiryState(new Date(NOW.getTime() + 90 * day), 30, NOW), "ok");
    assert.equal(readinessExpiryState(null, 30, NOW), "none");
  });

  test("write requires GOVCON_READINESS_MANAGE", async () => {
    await assert.rejects(
      () => createReadinessItem(viewerA, { category: "registration", name: "SAM.gov viewer" }),
      (err: unknown) => err instanceof AuthzError,
    );
  });

  test("getExpiringItems returns items within the lead window", async () => {
    await createReadinessItem(adminA, {
      category: "registration",
      name: "SAM Registration",
      expirationDate: new Date(NOW.getTime() + 5 * day).toISOString(),
      reminderLeadDays: 30,
    });
    await createReadinessItem(adminA, {
      category: "certification",
      name: "CMMC L2",
      expirationDate: new Date(NOW.getTime() + 200 * day).toISOString(),
      reminderLeadDays: 30,
    });
    await createReadinessItem(adminA, {
      category: "insurance",
      name: "GL Policy",
      expirationDate: new Date(NOW.getTime() - 2 * day).toISOString(),
      reminderLeadDays: 30,
    });

    const expiring = await getExpiringItems(adminA, 30, NOW);
    const names = expiring.map((e) => e.item.name);
    assert.ok(names.includes("SAM Registration"));
    assert.ok(names.includes("GL Policy"));
    assert.ok(!names.includes("CMMC L2"));

    // Classification is carried through.
    const gl = expiring.find((e) => e.item.name === "GL Policy");
    assert.equal(gl?.expiry, "expired");
    const sam = expiring.find((e) => e.item.name === "SAM Registration");
    assert.equal(sam?.expiry, "expiring_soon");

    // listReadiness also carries expiry state.
    const all = await listReadiness(adminA, {}, NOW);
    const cmmc = all.find((e) => e.item.name === "CMMC L2");
    assert.equal(cmmc?.expiry, "ok");
  });
});
