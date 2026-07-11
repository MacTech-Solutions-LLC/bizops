/**
 * Capture planning service — the pre-proposal intelligence workspace for a
 * pursuit. Follows the opportunity-service conventions exactly:
 *  - every function takes a `GovConContext` and gates on a permission,
 *  - every query filters by `ctx.tenantOrgId`,
 *  - mutations run inside `prisma.$transaction` + `recordAudit`.
 *
 * Read → GOVCON_VIEW. Write (plan + sections) → GOVCON_CAPTURE_MANAGE.
 * A LOCKED section rejects body edits; unlocking requires GOVCON_CAPTURE_MANAGE
 * and an explicit `unlock` flag.
 */

import { Prisma, GovConCaptureSectionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { ConflictError, NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  addCaptureSectionSchema,
  updateCaptureSectionSchema,
  upsertCapturePlanSchema,
} from "@/lib/validation/capture";

const PLAN_INCLUDE = {
  sections: { orderBy: { orderIndex: "asc" } },
} satisfies Prisma.GovConCapturePlanInclude;

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("capture_service_failed", err, { op });
    throw new OperationalError("Capture operation failed", { cause: err });
  }
}

/** Assert the opportunity exists in this tenant; returns it. */
async function requireOpportunity(
  db: Prisma.TransactionClient | typeof prisma,
  ctx: GovConContext,
  opportunityId: string,
) {
  const opp = await db.govConOpportunity.findFirst({
    where: { id: opportunityId, hubOrganizationId: ctx.tenantOrgId },
    select: { id: true, internalName: true },
  });
  if (!opp) throw new NotFoundError("Opportunity not found");
  return opp;
}

/**
 * Fetch the capture plan for an opportunity, creating one on first access. When
 * `createIfMissing` is false, returns null instead (list contexts).
 */
export async function getCapturePlanForOpportunity(
  ctx: GovConContext,
  opportunityId: string,
  createIfMissing = true,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return guard("getPlan", async () => {
    await requireOpportunity(prisma, ctx, opportunityId);
    const existing = await prisma.govConCapturePlan.findUnique({
      where: { opportunityId },
      include: PLAN_INCLUDE,
    });
    if (existing) return existing;
    if (!createIfMissing) return null;

    // Create-on-first-access requires write permission (it's a mutation).
    requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CAPTURE_MANAGE);
    return prisma.$transaction(async (tx) => {
      const created = await tx.govConCapturePlan.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          opportunityId,
          ownerId: ctx.actorHubUserId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
        include: PLAN_INCLUDE,
      });
      await recordAudit(tx, ctx, {
        action: "capture.created",
        entityType: "GovConCapturePlan",
        entityId: created.id,
        opportunityId,
        summary: "Capture plan started",
      });
      return created;
    });
  });
}

/** Update the capture plan narrative fields (optimistic version + audit). */
export async function upsertCapturePlan(
  ctx: GovConContext,
  opportunityId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CAPTURE_MANAGE);
  const input = parseOrThrow(upsertCapturePlanSchema, rawInput);
  const { expectedVersion, ...fields } = input;

  return guard("upsertPlan", () =>
    prisma.$transaction(async (tx) => {
      await requireOpportunity(tx, ctx, opportunityId);
      const existing = await tx.govConCapturePlan.findUnique({ where: { opportunityId } });

      const data = toWriteData(fields);

      if (!existing) {
        const created = await tx.govConCapturePlan.create({
          data: {
            ...data,
            hubOrganizationId: ctx.tenantOrgId,
            opportunityId,
            ownerId: (data.ownerId as string | null | undefined) ?? ctx.actorHubUserId,
            createdBy: ctx.actorHubUserId,
            updatedBy: ctx.actorHubUserId,
          },
          include: PLAN_INCLUDE,
        });
        await recordAudit(tx, ctx, {
          action: "capture.updated",
          entityType: "GovConCapturePlan",
          entityId: created.id,
          opportunityId,
          summary: "Capture plan updated",
        });
        return created;
      }

      if (expectedVersion !== undefined && expectedVersion !== existing.version) {
        throw new ConflictError("This capture plan was modified by someone else.", {
          context: { current: existing.version, expected: expectedVersion },
        });
      }

      const updated = await tx.govConCapturePlan.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
        },
        include: PLAN_INCLUDE,
      });
      await recordAudit(tx, ctx, {
        action: "capture.updated",
        entityType: "GovConCapturePlan",
        entityId: updated.id,
        opportunityId,
        summary: "Capture plan updated",
      });
      return updated;
    }),
  );
}

/** Ensure a plan exists (write-gated); returns its id. */
async function ensurePlanId(
  tx: Prisma.TransactionClient,
  ctx: GovConContext,
  opportunityId: string,
): Promise<string> {
  await requireOpportunity(tx, ctx, opportunityId);
  const existing = await tx.govConCapturePlan.findUnique({
    where: { opportunityId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.govConCapturePlan.create({
    data: {
      hubOrganizationId: ctx.tenantOrgId,
      opportunityId,
      ownerId: ctx.actorHubUserId,
      createdBy: ctx.actorHubUserId,
      updatedBy: ctx.actorHubUserId,
    },
    select: { id: true },
  });
  return created.id;
}

export async function addCaptureSection(
  ctx: GovConContext,
  opportunityId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CAPTURE_MANAGE);
  const input = parseOrThrow(addCaptureSectionSchema, rawInput);

  return guard("addSection", () =>
    prisma.$transaction(async (tx) => {
      const planId = await ensurePlanId(tx, ctx, opportunityId);
      const orderIndex =
        input.orderIndex ??
        (await tx.govConCaptureSection.count({ where: { capturePlanId: planId } }));
      const created = await tx.govConCaptureSection.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          capturePlanId: planId,
          title: input.title,
          body: input.body ?? null,
          ownerId: input.ownerId ?? null,
          orderIndex,
        },
      });
      await recordAudit(tx, ctx, {
        action: "capture.section_added",
        entityType: "GovConCaptureSection",
        entityId: created.id,
        opportunityId,
        summary: `Added capture section “${created.title}”`,
      });
      return created;
    }),
  );
}

export async function updateCaptureSection(
  ctx: GovConContext,
  opportunityId: string,
  sectionId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CAPTURE_MANAGE);
  const input = parseOrThrow(updateCaptureSectionSchema, rawInput);

  return guard("updateSection", () =>
    prisma.$transaction(async (tx) => {
      await requireOpportunity(tx, ctx, opportunityId);
      const existing = await tx.govConCaptureSection.findFirst({
        where: {
          id: sectionId,
          hubOrganizationId: ctx.tenantOrgId,
          capturePlan: { opportunityId },
        },
      });
      if (!existing) throw new NotFoundError("Capture section not found");

      if (input.expectedVersion !== undefined && input.expectedVersion !== existing.version) {
        throw new ConflictError("This section was modified by someone else.", {
          context: { current: existing.version, expected: input.expectedVersion },
        });
      }

      const data: Prisma.GovConCaptureSectionUpdateInput = {};
      let action = "capture.section_updated";
      let summary = `Updated capture section “${existing.title}”`;

      // A LOCKED section rejects body/content edits. The actor may unlock it
      // (they already have GOVCON_CAPTURE_MANAGE) via an explicit `unlock`.
      const isLocked = existing.status === GovConCaptureSectionStatus.LOCKED;
      const wantsBodyEdit =
        input.title !== undefined ||
        input.body !== undefined ||
        input.ownerId !== undefined ||
        input.orderIndex !== undefined;

      if (isLocked && wantsBodyEdit && !input.unlock) {
        throw new ConflictError("This section is locked. Unlock it before editing.", {
          context: { sectionId, status: existing.status },
        });
      }

      if (input.unlock && isLocked) {
        data.status = GovConCaptureSectionStatus.APPROVED;
        data.lockedAt = null;
        action = "capture.section_unlocked";
        summary = `Unlocked capture section “${existing.title}”`;
      }

      // Explicit status transitions (approve / lock).
      if (input.status === GovConCaptureSectionStatus.APPROVED) {
        data.status = GovConCaptureSectionStatus.APPROVED;
        data.approvedBy = ctx.actorHubUserId;
        data.approvedAt = new Date();
        action = "capture.section_approved";
        summary = `Approved capture section “${existing.title}”`;
      } else if (input.status === GovConCaptureSectionStatus.LOCKED) {
        data.status = GovConCaptureSectionStatus.LOCKED;
        data.lockedAt = new Date();
        action = "capture.section_locked";
        summary = `Locked capture section “${existing.title}”`;
      } else if (input.status !== undefined && data.status === undefined) {
        data.status = input.status;
      }

      if (input.title !== undefined) data.title = input.title;
      if (input.body !== undefined) data.body = input.body;
      if (input.ownerId !== undefined) data.ownerId = input.ownerId;
      if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;

      const updated = await tx.govConCaptureSection.update({
        where: { id: existing.id },
        data: { ...data, version: { increment: 1 } },
      });
      await recordAudit(tx, ctx, {
        action,
        entityType: "GovConCaptureSection",
        entityId: updated.id,
        opportunityId,
        summary,
        before: { status: existing.status },
        after: { status: updated.status },
      });
      return updated;
    }),
  );
}

/**
 * List pursuits that are in capture (have a plan, or are in a capture-relevant
 * stage). Used by the top-level Capture worklist.
 */
export async function listCapturePursuits(ctx: GovConContext) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return guard("listCapturePursuits", () =>
    prisma.govConOpportunity.findMany({
      where: {
        hubOrganizationId: ctx.tenantOrgId,
        archivedAt: null,
        OR: [
          { capturePlan: { isNot: null } },
          { stage: { in: ["QUALIFIED", "CAPTURE", "BID_NO_BID"] } },
        ],
      },
      orderBy: [{ proposalDeadline: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      include: {
        agency: true,
        capturePlan: { select: { id: true, updatedAt: true, sections: { select: { id: true, status: true } } } },
      },
    }),
  );
}

/** Strip undefined keys so writes only touch provided fields. */
function toWriteData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    data[k] = v;
  }
  return data;
}
