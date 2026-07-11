import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, NotFoundError } from "@/lib/errors";
import {
  comparePartners,
  createPartner,
  getPartner,
  listPartners,
} from "@/lib/services/partners";

const TENANT_A = `test_partner_a_${process.pid}`;
const TENANT_B = `test_partner_b_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });
const adminB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: "user_b_admin" });
const viewerA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_viewer",
  roles: ["govcon_viewer"],
  permissions: new Set([GOVCON_PERMISSIONS.GOVCON_VIEW]),
});

async function cleanup() {
  for (const t of [TENANT_A, TENANT_B]) {
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConPartnerContact.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConPartner.deleteMany({ where: { hubOrganizationId: t } });
  }
}

describe("partner service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("create requires GOVCON_PARTNERS_MANAGE", async () => {
    await assert.rejects(
      () => createPartner(viewerA, { legalName: "Viewer Co" }),
      (err: unknown) => err instanceof AuthzError,
    );
  });

  test("tenant isolation: B cannot read A's partner", async () => {
    const p = await createPartner(adminA, { legalName: "Alpha Systems" });
    assert.equal(p.hubOrganizationId, TENANT_A);
    await assert.rejects(
      () => getPartner(adminB, p.id),
      (err: unknown) => err instanceof NotFoundError,
    );
    const listB = await listPartners(adminB, {});
    assert.equal(listB.some((x) => x.id === p.id), false);
  });

  test("comparePartners returns a gap matrix", async () => {
    const p1 = await createPartner(adminA, {
      legalName: "Beta Defense",
      businessSize: "SMALL",
      socioeconomicStatus: ["SDVOSB", "HUBZone"],
      naicsCapabilities: ["541512"],
      contractVehicles: ["GSA MAS"],
      ndaStatus: "EXECUTED",
    });
    const p2 = await createPartner(adminA, {
      legalName: "Gamma Labs",
      businessSize: "OTHER_THAN_SMALL",
      socioeconomicStatus: ["WOSB"],
      naicsCapabilities: ["541512", "541519"],
      contractVehicles: [],
      teamingStatus: "REQUESTED",
    });

    const matrix = await comparePartners(adminA, [p1.id, p2.id]);
    assert.equal(matrix.partners.length, 2);
    assert.equal(matrix.partners[0].id, p1.id);

    // Socioeconomic union across both partners.
    const socioLabels = matrix.socioeconomic.map((r) => r.label).sort();
    assert.deepEqual(socioLabels, ["HUBZone", "SDVOSB", "WOSB"]);
    const sdvosb = matrix.socioeconomic.find((r) => r.label === "SDVOSB");
    assert.deepEqual(sdvosb?.presence, [true, false]);

    // NAICS capabilities: 541519 only present for partner 2.
    const naics519 = matrix.capabilities.find((r) => r.label === "541519");
    assert.deepEqual(naics519?.presence, [false, true]);

    // Agreements row carries per-partner statuses.
    const nda = matrix.agreements.find((r) => r.label === "NDA");
    assert.deepEqual(nda?.statuses, ["EXECUTED", "NONE"]);
  });
});
