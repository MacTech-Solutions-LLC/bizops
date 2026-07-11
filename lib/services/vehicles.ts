/**
 * Contract vehicle service — CRUD for IDIQ/GWAC/BPA/GSA vehicles. Follows the
 * GovCon service contract (context + permission gate + tenant filter + audited
 * transactional mutations).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleFilterSchema,
  type VehicleFilter,
} from "@/lib/validation/vehicle";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("vehicle_service_failed", err, { op });
    throw new OperationalError("Vehicle operation failed", { cause: err });
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

export async function listVehicles(ctx: GovConContext, rawFilter: unknown = {}) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter: VehicleFilter = parseOrThrow(vehicleFilterSchema, rawFilter);

  const where: Prisma.GovConContractVehicleWhereInput = { hubOrganizationId: ctx.tenantOrgId };
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: "insensitive" } },
      { agency: { contains: filter.q, mode: "insensitive" } },
      { primeHolder: { contains: filter.q, mode: "insensitive" } },
      { contractNumber: { contains: filter.q, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.GovConContractVehicleOrderByWithRelationInput =
    filter.sortBy === "endDate"
      ? { endDate: { sort: filter.sortDir, nulls: "last" } }
      : filter.sortBy === "ceiling"
        ? { ceiling: { sort: filter.sortDir, nulls: "last" } }
        : filter.sortBy === "updatedAt"
          ? { updatedAt: filter.sortDir }
          : { name: filter.sortDir };

  return guard("list", () =>
    prisma.govConContractVehicle.findMany({
      where,
      orderBy,
      include: { _count: { select: { opportunities: true } } },
    }),
  );
}

export async function getVehicle(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const vehicle = await guard("get", () =>
    prisma.govConContractVehicle.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: {
        opportunities: {
          orderBy: { proposalDeadline: { sort: "asc", nulls: "last" } },
          include: { agency: true },
        },
      },
    }),
  );
  if (!vehicle) throw new NotFoundError("Contract vehicle not found");
  return vehicle;
}

export async function createVehicle(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  const input = parseOrThrow(createVehicleSchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.govConContractVehicle.create({
        data: {
          ...toWriteData(input),
          name: input.name,
          hubOrganizationId: ctx.tenantOrgId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "vehicle.created",
        entityType: "GovConContractVehicle",
        entityId: created.id,
        summary: `Added contract vehicle “${created.name}”`,
      });
      return created;
    }),
  );
}

export async function updateVehicle(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  const input = parseOrThrow(updateVehicleSchema, rawInput);

  return guard("update", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConContractVehicle.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Contract vehicle not found");
      const updated = await tx.govConContractVehicle.update({
        where: { id: existing.id },
        data: { ...toWriteData(input), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "vehicle.updated",
        entityType: "GovConContractVehicle",
        entityId: updated.id,
        summary: `Updated contract vehicle “${updated.name}”`,
      });
      return updated;
    }),
  );
}
