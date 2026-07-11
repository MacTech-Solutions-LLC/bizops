/** Milestone service — tenant-scoped. */

import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";
import { createMilestoneSchema, updateMilestoneSchema } from "@/lib/validation/milestone";

/** Upcoming (not-completed) milestones due within `days`, across the tenant. */
export async function getUpcomingMilestones(ctx: GovConContext, days = 45) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return prisma.govConMilestone.findMany({
    where: {
      hubOrganizationId: ctx.tenantOrgId,
      status: { in: ["PENDING", "SCHEDULED"] },
      dueAt: { lte: until },
    },
    orderBy: { dueAt: "asc" },
    take: 25,
    include: { opportunity: { select: { id: true, internalName: true } } },
  });
}

export async function listMilestonesForOpportunity(ctx: GovConContext, opportunityId: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.govConMilestone.findMany({
    where: { hubOrganizationId: ctx.tenantOrgId, opportunityId },
    orderBy: { dueAt: "asc" },
  });
}

export async function createMilestone(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EDIT);
  const input = parseOrThrow(createMilestoneSchema, rawInput);
  // Ensure the target opportunity is in this tenant.
  const opp = await prisma.govConOpportunity.findFirst({
    where: { id: input.opportunityId, hubOrganizationId: ctx.tenantOrgId },
    select: { id: true },
  });
  if (!opp) throw new NotFoundError("Opportunity not found");

  return prisma.$transaction(async (tx) => {
    const created = await tx.govConMilestone.create({
      data: {
        hubOrganizationId: ctx.tenantOrgId,
        opportunityId: input.opportunityId,
        type: input.type ?? "OTHER",
        title: input.title,
        dueAt: input.dueAt ?? null,
        status: input.status ?? "SCHEDULED",
        ownerId: input.ownerId ?? null,
        notes: input.notes ?? null,
        createdBy: ctx.actorHubUserId,
      },
    });
    await recordAudit(tx, ctx, {
      action: "milestone.created",
      entityType: "GovConMilestone",
      entityId: created.id,
      opportunityId: input.opportunityId,
      summary: `Added milestone “${created.title}”`,
      after: { title: created.title, type: created.type, dueAt: created.dueAt },
    });
    return created;
  });
}

export async function updateMilestone(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EDIT);
  const input = parseOrThrow(updateMilestoneSchema, rawInput);
  const existing = await prisma.govConMilestone.findFirst({
    where: { id, hubOrganizationId: ctx.tenantOrgId },
  });
  if (!existing) throw new NotFoundError("Milestone not found");

  return prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) if (v !== undefined) data[k] = v;
    data.updatedBy = ctx.actorHubUserId;
    if (input.status === "COMPLETED" && !existing.completedAt) data.completedAt = new Date();
    const updated = await tx.govConMilestone.update({ where: { id: existing.id }, data });
    await recordAudit(tx, ctx, {
      action: "milestone.updated",
      entityType: "GovConMilestone",
      entityId: existing.id,
      opportunityId: existing.opportunityId,
      summary: `Updated milestone “${updated.title}”`,
      before: { status: existing.status, dueAt: existing.dueAt },
      after: { status: updated.status, dueAt: updated.dueAt },
    });
    return updated;
  });
}
