import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, NotFoundError } from "@/lib/errors";
import { createOpportunity } from "@/lib/services/opportunities";
import {
  addFinding,
  assignRequirement,
  closeReview,
  createProposal,
  createRequirement,
  getProposal,
  listProposals,
  scheduleReview,
} from "@/lib/services/proposals";
import { requirementCoverage } from "@/lib/services/proposal-metrics";

const TENANT_A = `test_prop_a_${process.pid}`;
const TENANT_B = `test_prop_b_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });
const adminB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: "user_b_admin" });
// Reviewer can add findings but cannot manage (create) proposals.
const reviewerA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_reviewer",
  roles: ["govcon_contributor"],
  permissions: new Set([
    GOVCON_PERMISSIONS.GOVCON_VIEW,
    GOVCON_PERMISSIONS.GOVCON_PROPOSAL_REVIEW,
  ]),
});

async function cleanup() {
  for (const t of [TENANT_A, TENANT_B]) {
    await prisma.govConReviewFinding.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConReview.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConRequirement.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConProposalVolume.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConProposal.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConOpportunityStageHistory.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConOpportunity.deleteMany({ where: { hubOrganizationId: t } });
  }
}

async function makeOpportunity(ctx = adminA, name = "Proposal test pursuit") {
  const opp = await createOpportunity(ctx, { internalName: name });
  return opp.id;
}

describe("proposal service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("create requires GOVCON_PROPOSAL_MANAGE and can seed standard volumes", async () => {
    const opportunityId = await makeOpportunity();

    // Reviewer lacks PROPOSAL_MANAGE → rejected.
    await assert.rejects(
      () => createProposal(reviewerA, { opportunityId, title: "Nope" }),
      (err: unknown) => err instanceof AuthzError,
    );

    const created = await createProposal(adminA, {
      opportunityId,
      title: "Volume II Technical Proposal",
      seedVolumes: true,
    });
    assert.equal(created.hubOrganizationId, TENANT_A);
    assert.equal(created.createdBy, "user_a_admin");

    const proposal = await getProposal(adminA, created.id);
    assert.equal(proposal.volumes.length, 7);
    assert.equal(proposal.volumes[0].name, "Executive Summary");

    const audit = await prisma.govConActivityEvent.findMany({
      where: { entityId: created.id, action: "proposal.created" },
    });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actorId, "user_a_admin");
  });

  test("assigning a requirement advances status and lifts coverage", async () => {
    const opportunityId = await makeOpportunity(adminA, "Coverage pursuit");
    const proposal = await createProposal(adminA, {
      opportunityId,
      title: "Coverage proposal",
      seedVolumes: true,
    });
    const req = await createRequirement(adminA, proposal.id, {
      refId: "L.3.1",
      text: "The offeror shall describe its technical approach.",
    });
    assert.equal(req.status, "UNASSIGNED");

    // Before assignment: 1 requirement, unassigned, 0% coverage.
    let detail = await getProposal(adminA, proposal.id);
    let coverage = requirementCoverage(detail.requirements);
    assert.equal(coverage.total, 1);
    assert.equal(coverage.unassigned, 1);
    assert.equal(coverage.coveragePercent, 0);

    // Assign to a volume with no explicit status → auto-advances to ASSIGNED.
    const volumeId = detail.volumes[1].id;
    const assigned = await assignRequirement(adminA, req.id, { volumeId });
    assert.equal(assigned.status, "ASSIGNED");
    assert.equal(assigned.volumeId, volumeId);

    detail = await getProposal(adminA, proposal.id);
    coverage = requirementCoverage(detail.requirements);
    assert.equal(coverage.unassigned, 0);
    assert.equal(coverage.coveragePercent, 100);
  });

  test("tenant isolation: B cannot read A's proposal or see it in the list", async () => {
    const opportunityId = await makeOpportunity(adminA, "Isolation pursuit");
    const created = await createProposal(adminA, { opportunityId, title: "A-only proposal" });

    await assert.rejects(
      () => getProposal(adminB, created.id),
      (err: unknown) => err instanceof NotFoundError,
    );
    const listB = await listProposals(adminB);
    assert.equal(listB.some((p) => p.id === created.id), false);
    const listA = await listProposals(adminA);
    assert.equal(listA.some((p) => p.id === created.id), true);
  });

  test("closeReview sets status COMPLETE + closedAt and records an audit event", async () => {
    const opportunityId = await makeOpportunity(adminA, "Review pursuit");
    const proposal = await createProposal(adminA, { opportunityId, title: "Review proposal" });
    const review = await scheduleReview(adminA, proposal.id, { type: "RED" });
    assert.equal(review.status, "SCHEDULED");
    assert.equal(review.closedAt, null);

    // A reviewer (PROPOSAL_REVIEW) can add a finding even without manage rights.
    const finding = await addFinding(reviewerA, review.id, {
      summary: "Win theme not threaded through Section 3",
      severity: "HIGH",
    });
    assert.equal(finding.status, "OPEN");

    const closed = await closeReview(adminA, review.id);
    assert.equal(closed.status, "COMPLETE");
    assert.ok(closed.closedAt);

    const audit = await prisma.govConActivityEvent.findMany({
      where: { entityId: review.id, action: "review.closed" },
    });
    assert.equal(audit.length, 1);
  });
});
