/**
 * Readiness item service — registrations, certifications, cyber, clearances,
 * insurance, and vehicle readiness. Follows the GovCon service contract
 * (context + permission gate + tenant filter + audited transactional mutations).
 *
 * IMPORTANT: readiness tracking is an internal management aid. It does NOT
 * independently establish legal, regulatory, or certification compliance. Expiry
 * classification is computed by the pure `readinessExpiryState` domain function.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import { readinessExpiryState, type ReadinessExpiryState } from "@/lib/domain/metrics";
import {
  createReadinessSchema,
  readinessFilterSchema,
  updateReadinessSchema,
  type ReadinessFilter,
} from "@/lib/validation/readiness";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("readiness_service_failed", err, { op });
    throw new OperationalError("Readiness operation failed", { cause: err });
  }
}

function toWriteData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    data[k] = v;
  }
  return data;
}

export type ReadinessItem = Prisma.GovConReadinessItemGetPayload<Record<string, never>>;
export interface ReadinessItemWithExpiry {
  item: ReadinessItem;
  expiry: ReadinessExpiryState;
}

/** List readiness items with a computed expiry state relative to `now`. */
export async function listReadiness(
  ctx: GovConContext,
  rawFilter: unknown = {},
  now: Date = new Date(),
): Promise<ReadinessItemWithExpiry[]> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter: ReadinessFilter = parseOrThrow(readinessFilterSchema, rawFilter);

  const where: Prisma.GovConReadinessItemWhereInput = { hubOrganizationId: ctx.tenantOrgId };
  if (filter.category) where.category = filter.category;
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: "insensitive" } },
      { issuer: { contains: filter.q, mode: "insensitive" } },
      { identifier: { contains: filter.q, mode: "insensitive" } },
    ];
  }

  const items = await guard("list", () =>
    prisma.govConReadinessItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  );
  return items.map((item) => ({
    item,
    expiry: readinessExpiryState(item.expirationDate, item.reminderLeadDays, now),
  }));
}

export async function getReadinessItem(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const item = await guard("get", () =>
    prisma.govConReadinessItem.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
    }),
  );
  if (!item) throw new NotFoundError("Readiness item not found");
  return item;
}

/** Items expiring within `days` (or already expired). Sorted soonest first. */
export async function getExpiringItems(
  ctx: GovConContext,
  days = 30,
  now: Date = new Date(),
): Promise<ReadinessItemWithExpiry[]> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const items = await guard("expiring", () =>
    prisma.govConReadinessItem.findMany({
      where: {
        hubOrganizationId: ctx.tenantOrgId,
        expirationDate: { not: null, lte: horizon },
      },
      orderBy: { expirationDate: "asc" },
    }),
  );
  return items.map((item) => ({
    item,
    expiry: readinessExpiryState(item.expirationDate, item.reminderLeadDays, now),
  }));
}

export async function createReadinessItem(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_READINESS_MANAGE);
  const input = parseOrThrow(createReadinessSchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.govConReadinessItem.create({
        data: {
          ...toWriteData(input),
          category: input.category,
          name: input.name,
          hubOrganizationId: ctx.tenantOrgId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "readiness.created",
        entityType: "GovConReadinessItem",
        entityId: created.id,
        summary: `Added readiness item “${created.name}” (${created.category})`,
      });
      return created;
    }),
  );
}

export async function updateReadinessItem(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_READINESS_MANAGE);
  const input = parseOrThrow(updateReadinessSchema, rawInput);

  return guard("update", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConReadinessItem.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Readiness item not found");
      const updated = await tx.govConReadinessItem.update({
        where: { id: existing.id },
        data: { ...toWriteData(input), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "readiness.updated",
        entityType: "GovConReadinessItem",
        entityId: updated.id,
        summary: `Updated readiness item “${updated.name}”`,
      });
      return updated;
    }),
  );
}
