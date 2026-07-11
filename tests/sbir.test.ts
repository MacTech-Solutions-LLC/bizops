import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, NotFoundError } from "@/lib/errors";
import { createTopic, getTopic, listTopics, upsertAssessment } from "@/lib/services/sbir";

const TENANT_A = `test_sbir_a_${process.pid}`;
const TENANT_B = `test_sbir_b_${process.pid}`;

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
    await prisma.govConSbirAssessment.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConSbirTopic.deleteMany({ where: { hubOrganizationId: t } });
  }
}

describe("sbir service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("create requires GOVCON_SBIR_MANAGE", async () => {
    await assert.rejects(
      () => createTopic(viewerA, { topicNumber: "T-1", topicTitle: "Viewer cannot" }),
      (err: unknown) => err instanceof AuthzError,
    );
  });

  test("upsertAssessment computes weightedScore and requires GOVCON_SBIR_MANAGE", async () => {
    const topic = await createTopic(adminA, {
      program: "SBIR",
      topicNumber: "AF-2026-001",
      topicTitle: "Autonomous ISR",
      phase: "PHASE_I",
    });
    assert.equal(topic.hubOrganizationId, TENANT_A);

    // Viewer cannot score.
    await assert.rejects(
      () => upsertAssessment(viewerA, topic.id, { missionAlignment: 5 }),
      (err: unknown) => err instanceof AuthzError,
    );

    // All-5 assessment across every weighted criterion → 100.
    const saved = await upsertAssessment(adminA, topic.id, {
      missionAlignment: 5,
      technicalNovelty: 5,
      feasibility: 5,
      existingIp: 5,
      piAvailability: 5,
      commercialization: 5,
      phaseIiiPathway: 5,
      transitionSponsor: 5,
      pastPerformance: 5,
      teamCompleteness: 5,
      timeRemaining: 5,
      proposalEffort: 5,
      competitiveIntensity: 5,
      recommendation: "pursue",
    });
    assert.equal(Number(saved.weightedScore), 100);
    assert.equal(saved.recommendation, "pursue");

    // Partial update merges over existing scores; weighted score recomputed.
    const updated = await upsertAssessment(adminA, topic.id, { missionAlignment: 0 });
    // Dropping missionAlignment (weight 3) from a perfect board:
    // maxWeighted total = 27 (sum of weights) * 5 = 135; lose 3*5 = 15 → 120/135.
    assert.ok(Number(updated.weightedScore) < 100);
    assert.equal(Math.round(Number(updated.weightedScore) * 100) / 100, Math.round((120 / 135) * 10000) / 100);

    const fetched = await getTopic(adminA, topic.id);
    assert.equal(fetched.assessment?.recommendation, "pursue");
  });

  test("tenant isolation: B cannot read A's topic", async () => {
    const topic = await createTopic(adminA, { topicNumber: "ISO-1", topicTitle: "A only" });
    await assert.rejects(
      () => getTopic(adminB, topic.id),
      (err: unknown) => err instanceof NotFoundError,
    );
    const listB = await listTopics(adminB, {});
    assert.equal(listB.some((t) => t.id === topic.id), false);
  });
});
