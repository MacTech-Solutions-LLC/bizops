import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError } from "@/lib/errors";
import {
  assembleCompanyFacts,
  assembleCompanyDraftInput,
  seedCompanyDraft,
  type MemberContribution,
} from "@/lib/company-statement/assemble";
import { buildCompanyStatementPayload } from "@/lib/company-statement/payload";
import { saveCompanyStatementSchema } from "@/lib/validation/company-statement";
import {
  getCompanyStatement,
  saveCompanyStatement,
} from "@/lib/services/company-statement";
import { listTeamRoster } from "@/lib/services/team";

// ---------------------------------------------------------------------------
// Pure assembly
// ---------------------------------------------------------------------------

function contribution(overrides: Partial<MemberContribution> = {}): MemberContribution {
  return {
    hubUserId: "user_1",
    headline: "Senior Systems Engineer",
    laborCategory: "SE III",
    yearsExperience: 10,
    clearanceLevel: "secret",
    naicsCodes: ["541512"],
    skills: ["RMF", "AWS"],
    certifications: [{ name: "CISSP", issuer: "ISC2" }],
    federalPastPerformance: [
      {
        organization: "Booz Allen",
        role: "Engineer",
        agency: "U.S. Navy",
        contractName: "NAVSEA Cloud",
        period: "2019–Present",
        summary: "Cloud migration.",
      },
    ],
    statement: {
      professionalSummary: "Delivers secure cloud.",
      coreCompetencies: ["Cloud migration", "RMF"],
      differentiators: ["Active Secret clearance"],
      pastPerformanceHighlights: ["Led NAVSEA cloud migration"],
    },
    ...overrides,
  };
}

describe("company statement assembly", () => {
  test("facts aggregate, de-duplicate, and count across members", () => {
    const facts = assembleCompanyFacts(
      { legalName: "MacTech", dba: null, cageCode: "1ABC2", uei: "U123", naicsPrimary: "541519" },
      [
        contribution(),
        contribution({ hubUserId: "user_2", clearanceLevel: "ts_sci", skills: ["RMF"] }),
        // Same cert + same engagement as user_1 — must not double.
        contribution({ hubUserId: "user_3", clearanceLevel: "none" }),
      ],
    );

    assert.equal(facts.teamSize, 3);
    assert.equal(facts.company?.cageCode, "1ABC2");
    // Company primary NAICS first, member codes after.
    assert.equal(facts.naics[0]?.code, "541519");
    assert.ok(facts.naics.some((n) => n.code === "541512"));
    // CISSP held by all three members → one row, count 3.
    assert.deepEqual(facts.certifications, [{ name: "CISSP", count: 3 }]);
    // Identical engagements de-duplicate to one row.
    assert.equal(facts.pastPerformance.length, 1);
    // Clearance mix omits "none", highest first.
    assert.deepEqual(
      facts.clearanceMix.map((c) => c.count),
      [1, 1],
    );
  });

  test("draft input carries confirmed member statements, without names", () => {
    const input = assembleCompanyDraftInput(null, [contribution()]);
    assert.equal(input.members.length, 1);
    assert.deepEqual(input.members[0].coreCompetencies, ["Cloud migration", "RMF"]);
    // The prompt unit must never carry identity.
    assert.ok(!("hubUserId" in input.members[0]));
    assert.ok(!("displayName" in input.members[0]));
  });

  test("seed draft frequency-ranks confirmed content and derives counts only", () => {
    const seed = seedCompanyDraft([
      contribution(),
      contribution({ hubUserId: "user_2" }),
      contribution({
        hubUserId: "user_3",
        statement: null,
        skills: ["Zero Trust"],
        clearanceLevel: "none",
        certifications: [],
      }),
    ]);
    // Statement competencies (2 members each) outrank the lone skill fallback.
    assert.equal(seed.coreCompetencies[0], "Cloud migration");
    assert.ok(seed.coreCompetencies.includes("Zero Trust"));
    // Never invents a summary — a human writes it.
    assert.equal(seed.professionalSummary, null);
    assert.ok(seed.differentiators.some((d) => d.includes("2 cleared team members")));
    // Confirmed highlights are copied verbatim, de-duplicated.
    assert.deepEqual(seed.pastPerformanceHighlights, ["Led NAVSEA cloud migration"]);
  });

  test("payload → schema seam holds (blank bullets dropped, model is a label)", () => {
    const payload = buildCompanyStatementPayload({
      professionalSummary: "  ",
      coreCompetencies: ["RMF", "", "  "],
      differentiators: [],
      pastPerformanceHighlights: ["x"],
      generateModel: "claude-opus-4-8",
    });
    const parsed = saveCompanyStatementSchema.parse(payload);
    assert.equal(parsed.professionalSummary, null);
    assert.deepEqual(parsed.coreCompetencies, ["RMF"]);
    assert.equal(parsed.generateModel, "claude-opus-4-8");
  });
});

// ---------------------------------------------------------------------------
// Service (DB-backed)
// ---------------------------------------------------------------------------

const TENANT_A = `test_company_stmt_a_${process.pid}`;
const TENANT_B = `test_company_stmt_b_${process.pid}`;

const managerA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_mgr" });
const managerB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: "user_mgr_b" });

/** A plain member: workspace view + self grant, but NOT profile:manage. */
const memberA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_member",
  roles: ["read_only_user"],
  permissions: new Set([
    GOVCON_PERMISSIONS.GOVCON_VIEW,
    GOVCON_PERMISSIONS.GOVCON_PROFILE_SELF_MANAGE,
  ]),
});

async function cleanup() {
  for (const tenant of [TENANT_A, TENANT_B]) {
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: tenant } });
    await prisma.govConCompanyCapabilityStatement.deleteMany({
      where: { hubOrganizationId: tenant },
    });
    await prisma.govConMemberProfile.deleteMany({ where: { hubOrganizationId: tenant } });
  }
}

async function seedPublishedMember(tenant: string, hubUserId: string) {
  const profile = await prisma.govConMemberProfile.create({
    data: {
      hubOrganizationId: tenant,
      hubUserId,
      status: "published",
      headline: "Engineer",
      laborCategory: "SE II",
      clearanceLevel: "secret",
      naicsCodes: ["541512"],
      resumeParsedAt: new Date(),
      skills: { create: [{ name: "RMF", confirmed: true }] },
    },
  });
  await prisma.govConCapabilityStatement.create({
    data: {
      hubOrganizationId: tenant,
      hubUserId,
      profileId: profile.id,
      coreCompetencies: ["RMF"],
      differentiators: ["Secret clearance"],
      pastPerformanceHighlights: ["Did a thing for the Navy"],
      confirmedAt: new Date(),
    },
  });
}

describe("company statement service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(async () => {
    await cleanup();
    await seedPublishedMember(TENANT_A, "user_member");
  });
  after(cleanup);

  test("members without profile:manage cannot save", async () => {
    await assert.rejects(
      saveCompanyStatement(memberA, { coreCompetencies: ["x"] }),
      AuthzError,
    );
  });

  test("save stamps server-derived provenance and get round-trips", async () => {
    const saved = await saveCompanyStatement(managerA, {
      professionalSummary: "MacTech delivers.",
      coreCompetencies: ["RMF"],
      differentiators: ["Secret-cleared team"],
      pastPerformanceHighlights: ["Did a thing for the Navy"],
      generateModel: "claude-opus-4-8",
    });

    assert.equal(saved.statement?.professionalSummary, "MacTech delivers.");
    assert.equal(saved.statement?.confirmedByHubUserId, "user_mgr");
    // Provenance comes from the published contributors, not the payload.
    assert.deepEqual(saved.statement?.sourceHubUserIds, ["user_member"]);

    // Any workspace member can read it, with live facts.
    const view = await getCompanyStatement(memberA);
    assert.equal(view.statement?.professionalSummary, "MacTech delivers.");
    assert.equal(view.facts.teamSize, 1);
    assert.deepEqual(view.facts.certifications, []);
  });

  test("statement is tenant-scoped — org B sees none", async () => {
    const view = await getCompanyStatement(managerB);
    assert.equal(view.statement, null);
    assert.equal(view.facts.teamSize, 0);
  });

  test("upsert keeps one row per org and refreshes provenance", async () => {
    await seedPublishedMember(TENANT_A, "user_member_2");
    await saveCompanyStatement(managerA, {
      coreCompetencies: ["RMF", "Cloud"],
      generateModel: null,
    });
    const rows = await prisma.govConCompanyCapabilityStatement.findMany({
      where: { hubOrganizationId: TENANT_A },
    });
    assert.equal(rows.length, 1);
    assert.deepEqual([...rows[0].sourceHubUserIds].sort(), ["user_member", "user_member_2"]);
  });

  test("team roster surfaces the contribution alerts", async () => {
    // A draft-only member with nothing confirmed.
    await prisma.govConMemberProfile.create({
      data: { hubOrganizationId: TENANT_A, hubUserId: "user_lagging" },
    });

    const roster = await listTeamRoster(memberA);
    // Hub is mocked in tests → roster degrades to local rows.
    assert.equal(roster.fromHub, false);
    const lagging = roster.entries.find((e) => e.hubUserId === "user_lagging");
    assert.ok(lagging);
    assert.equal(lagging.hasResume, false);
    assert.equal(lagging.hasStatement, false);
    assert.equal(lagging.isContributing, false);
    const contributing = roster.entries.find((e) => e.hubUserId === "user_member");
    assert.equal(contributing?.isContributing, true);
    assert.ok(roster.coverage.missingResume.some((e) => e.hubUserId === "user_lagging"));
  });
});
