/**
 * Proposal Room service — proposals, volumes, the compliance/requirements
 * matrix, color-team reviews and their findings.
 *
 * Every function:
 *  - takes a `GovConContext` and enforces the required permission via
 *    `requireGovConPermission` (server-side, not UI hiding),
 *  - filters every query by `ctx.tenantOrgId` (no cross-tenant reads),
 *  - records an audit event for material mutations inside the transaction,
 *  - surfaces operational failures as errors (never silent empty data).
 *
 * Permissions:
 *  - read (list/get)                 → GOVCON_VIEW
 *  - proposal / volume / requirement → GOVCON_PROPOSAL_MANAGE
 *  - review schedule / close         → GOVCON_PROPOSAL_MANAGE
 *  - finding add / resolve           → GOVCON_PROPOSAL_REVIEW
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { ConflictError, NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  addFindingSchema,
  assignRequirementSchema,
  changeVolumeStatusSchema,
  createProposalSchema,
  createRequirementSchema,
  createVolumeSchema,
  resolveFindingSchema,
  scheduleReviewSchema,
  STANDARD_VOLUMES,
  updateProposalSchema,
  updateRequirementSchema,
  updateReviewSchema,
  updateVolumeSchema,
} from "@/lib/validation/proposal";
import { requirementCoverage, type CoverageStats } from "@/lib/services/proposal-metrics";

/** Wrap unexpected Prisma failures as OperationalError (503) with logging. */
async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("proposal_service_failed", err, { op });
    throw new OperationalError("Proposal operation failed", { cause: err });
  }
}

function assertVersion(current: number, expected: number | undefined): void {
  if (expected !== undefined && expected !== current) {
    throw new ConflictError("This record was modified by someone else.", {
      context: { current, expected },
    });
  }
}

/** Strip undefined keys so update() only writes provided fields. */
function toWriteData(
  input: Record<string, unknown>,
  omit: string[] = [],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (omit.includes(k)) continue;
    if (v === undefined) continue;
    data[k] = v;
  }
  return data;
}

// --- List / get -------------------------------------------------------------

export interface ProposalListItem {
  id: string;
  title: string;
  status: string;
  managerId: string | null;
  dueAt: Date | null;
  updatedAt: Date;
  opportunityId: string;
  opportunityName: string;
  solicitationNumber: string | null;
  agencyName: string | null;
  volumeCount: number;
  coverage: CoverageStats;
}

export async function listProposals(ctx: GovConContext): Promise<ProposalListItem[]> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);

  return guard("list", async () => {
    const proposals = await prisma.govConProposal.findMany({
      where: { hubOrganizationId: ctx.tenantOrgId },
      include: {
        opportunity: {
          select: {
            id: true,
            internalName: true,
            solicitationNumber: true,
            agency: { select: { name: true } },
          },
        },
        volumes: { select: { id: true } },
        requirements: { select: { status: true } },
      },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    });

    return proposals.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      managerId: p.managerId,
      dueAt: p.dueAt,
      updatedAt: p.updatedAt,
      opportunityId: p.opportunityId,
      opportunityName: p.opportunity.internalName,
      solicitationNumber: p.opportunity.solicitationNumber,
      agencyName: p.opportunity.agency?.name ?? null,
      volumeCount: p.volumes.length,
      coverage: requirementCoverage(p.requirements),
    }));
  });
}

const DETAIL_INCLUDE = {
  opportunity: {
    select: { id: true, internalName: true, solicitationNumber: true, proposalDeadline: true },
  },
  volumes: { orderBy: { orderIndex: "asc" }, include: { requirements: { select: { id: true } } } },
  requirements: { orderBy: { refId: "asc" } },
  reviews: {
    orderBy: { scheduledAt: "asc" },
    include: { findings: { orderBy: { createdAt: "asc" } } },
  },
} satisfies Prisma.GovConProposalInclude;

export async function getProposal(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const proposal = await guard("get", () =>
    prisma.govConProposal.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: DETAIL_INCLUDE,
    }),
  );
  if (!proposal) throw new NotFoundError("Proposal not found");
  return proposal;
}

// --- Proposal CRUD ----------------------------------------------------------

export async function createProposal(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(createProposalSchema, rawInput);

  return guard("createProposal", () =>
    prisma.$transaction(async (tx) => {
      // The opportunity must exist in this tenant.
      const opp = await tx.govConOpportunity.findFirst({
        where: { id: input.opportunityId, hubOrganizationId: ctx.tenantOrgId },
        select: { id: true },
      });
      if (!opp) throw new NotFoundError("Opportunity not found");

      const created = await tx.govConProposal.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          opportunityId: opp.id,
          title: input.title,
          managerId: input.managerId ?? null,
          dueAt: input.dueAt ?? null,
          status: input.status ?? "NOT_STARTED",
          notes: input.notes ?? null,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });

      if (input.seedVolumes) {
        await tx.govConProposalVolume.createMany({
          data: STANDARD_VOLUMES.map((name, index) => ({
            hubOrganizationId: ctx.tenantOrgId,
            proposalId: created.id,
            name,
            orderIndex: index,
          })),
        });
      }

      await recordAudit(tx, ctx, {
        action: "proposal.created",
        entityType: "GovConProposal",
        entityId: created.id,
        opportunityId: created.opportunityId,
        summary: `Created proposal “${created.title}”`,
        after: { title: created.title, status: created.status },
      });
      return created;
    }),
  );
}

export async function updateProposal(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(updateProposalSchema, rawInput);

  return guard("updateProposal", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConProposal.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Proposal not found");
      assertVersion(existing.version, input.expectedVersion);

      const updated = await tx.govConProposal.update({
        where: { id: existing.id },
        data: {
          ...toWriteData(input, ["expectedVersion"]),
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
        },
      });
      await recordAudit(tx, ctx, {
        action: "proposal.updated",
        entityType: "GovConProposal",
        entityId: updated.id,
        opportunityId: updated.opportunityId,
        summary: `Updated proposal “${updated.title}”`,
        before: { title: existing.title, status: existing.status },
        after: { title: updated.title, status: updated.status },
      });
      return updated;
    }),
  );
}

// --- Volume CRUD ------------------------------------------------------------

/** Load a volume's owning proposal (for tenant scope + opportunity audit id). */
async function loadVolume(tx: Prisma.TransactionClient, ctx: GovConContext, volumeId: string) {
  const volume = await tx.govConProposalVolume.findFirst({
    where: { id: volumeId, hubOrganizationId: ctx.tenantOrgId },
    include: { proposal: { select: { opportunityId: true } } },
  });
  if (!volume) throw new NotFoundError("Volume not found");
  return volume;
}

export async function createVolume(ctx: GovConContext, proposalId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(createVolumeSchema, rawInput);

  return guard("createVolume", () =>
    prisma.$transaction(async (tx) => {
      const proposal = await tx.govConProposal.findFirst({
        where: { id: proposalId, hubOrganizationId: ctx.tenantOrgId },
        select: { id: true, opportunityId: true },
      });
      if (!proposal) throw new NotFoundError("Proposal not found");

      const created = await tx.govConProposalVolume.create({
        data: {
          ...toWriteData(input, ["contributors", "orderIndex"]),
          contributors: input.contributors ?? [],
          orderIndex: input.orderIndex ?? 0,
          name: input.name,
          hubOrganizationId: ctx.tenantOrgId,
          proposalId: proposal.id,
        },
      });
      await recordAudit(tx, ctx, {
        action: "volume.created",
        entityType: "GovConProposalVolume",
        entityId: created.id,
        opportunityId: proposal.opportunityId,
        summary: `Added volume “${created.name}”`,
        after: { name: created.name, status: created.status },
      });
      return created;
    }),
  );
}

export async function updateVolume(ctx: GovConContext, volumeId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(updateVolumeSchema, rawInput);

  return guard("updateVolume", () =>
    prisma.$transaction(async (tx) => {
      const existing = await loadVolume(tx, ctx, volumeId);
      assertVersion(existing.version, input.expectedVersion);

      const data = toWriteData(input, ["expectedVersion", "contributors"]);
      if (input.contributors !== undefined) data.contributors = input.contributors;

      const updated = await tx.govConProposalVolume.update({
        where: { id: existing.id },
        data: { ...data, version: { increment: 1 } },
      });
      await recordAudit(tx, ctx, {
        action: "volume.updated",
        entityType: "GovConProposalVolume",
        entityId: updated.id,
        opportunityId: existing.proposal.opportunityId,
        summary: `Updated volume “${updated.name}”`,
        before: { name: existing.name, status: existing.status },
        after: { name: updated.name, status: updated.status },
      });
      return updated;
    }),
  );
}

export async function changeVolumeStatus(ctx: GovConContext, volumeId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(changeVolumeStatusSchema, rawInput);

  return guard("changeVolumeStatus", () =>
    prisma.$transaction(async (tx) => {
      const existing = await loadVolume(tx, ctx, volumeId);
      if (existing.status === input.status) return existing;

      const updated = await tx.govConProposalVolume.update({
        where: { id: existing.id },
        data: { status: input.status, version: { increment: 1 } },
      });
      await recordAudit(tx, ctx, {
        action: "volume.status_changed",
        entityType: "GovConProposalVolume",
        entityId: updated.id,
        opportunityId: existing.proposal.opportunityId,
        summary: `Volume “${updated.name}”: ${existing.status} → ${input.status}`,
        before: { status: existing.status },
        after: { status: input.status },
      });
      return updated;
    }),
  );
}

// --- Requirement CRUD -------------------------------------------------------

export async function createRequirement(
  ctx: GovConContext,
  proposalId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(createRequirementSchema, rawInput);

  return guard("createRequirement", () =>
    prisma.$transaction(async (tx) => {
      const proposal = await tx.govConProposal.findFirst({
        where: { id: proposalId, hubOrganizationId: ctx.tenantOrgId },
        select: { id: true, opportunityId: true },
      });
      if (!proposal) throw new NotFoundError("Proposal not found");

      const created = await tx.govConRequirement.create({
        data: {
          ...toWriteData(input, ["mandatory"]),
          refId: input.refId,
          text: input.text,
          mandatory: input.mandatory ?? true,
          hubOrganizationId: ctx.tenantOrgId,
          opportunityId: proposal.opportunityId,
          proposalId: proposal.id,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "requirement.created",
        entityType: "GovConRequirement",
        entityId: created.id,
        opportunityId: proposal.opportunityId,
        summary: `Added requirement ${created.refId}`,
        after: { refId: created.refId, status: created.status },
      });
      return created;
    }),
  );
}

/** Load a requirement scoped to tenant (for updates/assignment). */
async function loadRequirement(
  tx: Prisma.TransactionClient,
  ctx: GovConContext,
  requirementId: string,
) {
  const req = await tx.govConRequirement.findFirst({
    where: { id: requirementId, hubOrganizationId: ctx.tenantOrgId },
  });
  if (!req) throw new NotFoundError("Requirement not found");
  return req;
}

export async function updateRequirement(
  ctx: GovConContext,
  requirementId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(updateRequirementSchema, rawInput);

  return guard("updateRequirement", () =>
    prisma.$transaction(async (tx) => {
      const existing = await loadRequirement(tx, ctx, requirementId);

      const data = toWriteData(input, ["mandatory"]);
      if (input.mandatory !== undefined) data.mandatory = input.mandatory;

      const updated = await tx.govConRequirement.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "requirement.updated",
        entityType: "GovConRequirement",
        entityId: updated.id,
        opportunityId: updated.opportunityId,
        summary: `Updated requirement ${updated.refId}`,
        before: { status: existing.status, ownerId: existing.ownerId },
        after: { status: updated.status, ownerId: updated.ownerId },
      });
      return updated;
    }),
  );
}

export async function assignRequirement(
  ctx: GovConContext,
  requirementId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(assignRequirementSchema, rawInput);

  return guard("assignRequirement", () =>
    prisma.$transaction(async (tx) => {
      const existing = await loadRequirement(tx, ctx, requirementId);

      const data: Record<string, unknown> = {};
      if (input.ownerId !== undefined) data.ownerId = input.ownerId;
      if (input.volumeId !== undefined) data.volumeId = input.volumeId;
      if (input.status !== undefined) {
        data.status = input.status;
      } else {
        // Auto-advance an unassigned requirement to ASSIGNED once it gains an
        // owner or a volume; auto-revert to UNASSIGNED when both are cleared.
        const nextOwner = input.ownerId !== undefined ? input.ownerId : existing.ownerId;
        const nextVolume = input.volumeId !== undefined ? input.volumeId : existing.volumeId;
        if ((nextOwner || nextVolume) && existing.status === "UNASSIGNED") {
          data.status = "ASSIGNED";
        } else if (!nextOwner && !nextVolume && existing.status === "ASSIGNED") {
          data.status = "UNASSIGNED";
        }
      }

      const updated = await tx.govConRequirement.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "requirement.assigned",
        entityType: "GovConRequirement",
        entityId: updated.id,
        opportunityId: updated.opportunityId,
        summary: `Assigned requirement ${updated.refId}`,
        before: {
          ownerId: existing.ownerId,
          volumeId: existing.volumeId,
          status: existing.status,
        },
        after: { ownerId: updated.ownerId, volumeId: updated.volumeId, status: updated.status },
      });
      return updated;
    }),
  );
}

// --- Review CRUD ------------------------------------------------------------

export async function scheduleReview(ctx: GovConContext, proposalId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(scheduleReviewSchema, rawInput);

  return guard("scheduleReview", () =>
    prisma.$transaction(async (tx) => {
      const proposal = await tx.govConProposal.findFirst({
        where: { id: proposalId, hubOrganizationId: ctx.tenantOrgId },
        select: { id: true, opportunityId: true },
      });
      if (!proposal) throw new NotFoundError("Proposal not found");

      const created = await tx.govConReview.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          opportunityId: proposal.opportunityId,
          proposalId: proposal.id,
          type: input.type,
          scheduledAt: input.scheduledAt ?? null,
          scope: input.scope ?? null,
          reviewers: input.reviewers ?? [],
          instructions: input.instructions ?? null,
          status: "SCHEDULED",
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "review.scheduled",
        entityType: "GovConReview",
        entityId: created.id,
        opportunityId: proposal.opportunityId,
        summary: `Scheduled ${created.type} review`,
        after: { type: created.type, status: created.status },
      });
      return created;
    }),
  );
}

async function loadReview(tx: Prisma.TransactionClient, ctx: GovConContext, reviewId: string) {
  const review = await tx.govConReview.findFirst({
    where: { id: reviewId, hubOrganizationId: ctx.tenantOrgId },
  });
  if (!review) throw new NotFoundError("Review not found");
  return review;
}

export async function updateReview(ctx: GovConContext, reviewId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const input = parseOrThrow(updateReviewSchema, rawInput);

  return guard("updateReview", () =>
    prisma.$transaction(async (tx) => {
      const existing = await loadReview(tx, ctx, reviewId);
      const data = toWriteData(input, ["reviewers"]);
      if (input.reviewers !== undefined) data.reviewers = input.reviewers;

      const updated = await tx.govConReview.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "review.updated",
        entityType: "GovConReview",
        entityId: updated.id,
        opportunityId: updated.opportunityId,
        summary: `Updated ${updated.type} review`,
      });
      return updated;
    }),
  );
}

export async function closeReview(ctx: GovConContext, reviewId: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);

  return guard("closeReview", () =>
    prisma.$transaction(async (tx) => {
      const existing = await loadReview(tx, ctx, reviewId);
      const updated = await tx.govConReview.update({
        where: { id: existing.id },
        data: {
          status: "COMPLETE",
          closedAt: new Date(),
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "review.closed",
        entityType: "GovConReview",
        entityId: updated.id,
        opportunityId: updated.opportunityId,
        summary: `Closed ${updated.type} review`,
        before: { status: existing.status },
        after: { status: updated.status, closedAt: updated.closedAt },
      });
      return updated;
    }),
  );
}

// --- Finding CRUD (reviewer permission) -------------------------------------

export async function addFinding(ctx: GovConContext, reviewId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_REVIEW);
  const input = parseOrThrow(addFindingSchema, rawInput);

  return guard("addFinding", () =>
    prisma.$transaction(async (tx) => {
      const review = await loadReview(tx, ctx, reviewId);
      const created = await tx.govConReviewFinding.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          reviewId: review.id,
          summary: input.summary,
          detail: input.detail ?? null,
          severity: input.severity ?? "MEDIUM",
          ownerId: input.ownerId ?? null,
          status: "OPEN",
        },
      });
      await recordAudit(tx, ctx, {
        action: "finding.added",
        entityType: "GovConReviewFinding",
        entityId: created.id,
        opportunityId: review.opportunityId,
        summary: `Added ${created.severity} finding`,
        after: { severity: created.severity, status: created.status },
      });
      return created;
    }),
  );
}

export async function resolveFinding(ctx: GovConContext, findingId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_REVIEW);
  const input = parseOrThrow(resolveFindingSchema, rawInput);

  return guard("resolveFinding", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConReviewFinding.findFirst({
        where: { id: findingId, hubOrganizationId: ctx.tenantOrgId },
        include: { review: { select: { opportunityId: true } } },
      });
      if (!existing) throw new NotFoundError("Finding not found");

      const updated = await tx.govConReviewFinding.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          resolution: input.resolution ?? existing.resolution,
        },
      });
      await recordAudit(tx, ctx, {
        action: "finding.resolved",
        entityType: "GovConReviewFinding",
        entityId: updated.id,
        opportunityId: existing.review.opportunityId,
        summary: `Finding → ${updated.status}`,
        before: { status: existing.status },
        after: { status: updated.status },
      });
      return updated;
    }),
  );
}
