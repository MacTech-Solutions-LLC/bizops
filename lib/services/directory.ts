/**
 * Directory service — the company-wide address book (people + organizations).
 * Follows the GovCon service contract (context + permission gate + tenant
 * filter + audited transactional mutations). Reads gate on GOVCON_VIEW; writes
 * gate on GOVCON_DIRECTORY_MANAGE. Cross-app callers get a service context
 * from `lib/service-auth.ts` and flow through these same functions, so the
 * audit trail and vocabulary validation apply to every writer.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  createDirectoryContactSchema,
  createDirectoryOrganizationSchema,
  directoryContactFilterSchema,
  directoryOrganizationFilterSchema,
  updateDirectoryContactSchema,
  updateDirectoryOrganizationSchema,
  type DirectoryContactFilter,
  type DirectoryOrganizationFilter,
} from "@/lib/validation/directory";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("directory_service_failed", err, { op });
    throw new OperationalError("Directory operation failed", { cause: err });
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

/** Org names are unique per tenant; surface the violation as a field error. */
function rethrowDuplicateOrgName(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new ValidationError("Organization name already exists", {
      issues: { name: ["An organization with this name is already in the directory"] },
    });
  }
  throw err;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function listDirectoryOrganizations(ctx: GovConContext, rawFilter: unknown = {}) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter: DirectoryOrganizationFilter = parseOrThrow(directoryOrganizationFilterSchema, rawFilter);

  const where: Prisma.DirectoryOrganizationWhereInput = {
    hubOrganizationId: ctx.tenantOrgId,
    // Archived orgs stay out of pickers unless explicitly requested.
    status: filter.status ?? "ACTIVE",
  };
  if (filter.orgType) where.orgType = filter.orgType;
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: "insensitive" } },
      { abbreviation: { contains: filter.q, mode: "insensitive" } },
      { city: { contains: filter.q, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.DirectoryOrganizationOrderByWithRelationInput =
    filter.sortBy === "updatedAt"
      ? { updatedAt: filter.sortDir }
      : filter.sortBy === "createdAt"
        ? { createdAt: filter.sortDir }
        : { name: filter.sortDir };

  return guard("orgList", () =>
    prisma.directoryOrganization.findMany({
      where,
      orderBy,
      include: { _count: { select: { contacts: true } } },
    }),
  );
}

export async function getDirectoryOrganization(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const org = await guard("orgGet", () =>
    prisma.directoryOrganization.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: { contacts: { orderBy: { name: "asc" } } },
    }),
  );
  if (!org) throw new NotFoundError("Organization not found");
  return org;
}

export async function createDirectoryOrganization(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE);
  const input = parseOrThrow(createDirectoryOrganizationSchema, rawInput);

  return guard("orgCreate", () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.directoryOrganization.create({
        data: {
          ...toWriteData(input),
          name: input.name,
          tags: input.tags ?? [],
          hubOrganizationId: ctx.tenantOrgId,
          sourceApp: ctx.sourceApp ?? "bizops",
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "directory.organization_created",
        entityType: "DirectoryOrganization",
        entityId: created.id,
        summary: `Added ${created.name} to the directory`,
      });
      return created;
    }).catch(rethrowDuplicateOrgName),
  );
}

export async function updateDirectoryOrganization(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE);
  const input = parseOrThrow(updateDirectoryOrganizationSchema, rawInput);

  return guard("orgUpdate", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.directoryOrganization.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Organization not found");
      const updated = await tx.directoryOrganization.update({
        where: { id: existing.id },
        data: { ...toWriteData(input), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "directory.organization_updated",
        entityType: "DirectoryOrganization",
        entityId: updated.id,
        summary: `Updated directory organization ${updated.name}`,
      });
      return updated;
    }).catch(rethrowDuplicateOrgName),
  );
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function listDirectoryContacts(ctx: GovConContext, rawFilter: unknown = {}) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter: DirectoryContactFilter = parseOrThrow(directoryContactFilterSchema, rawFilter);

  const where: Prisma.DirectoryContactWhereInput = {
    hubOrganizationId: ctx.tenantOrgId,
    status: filter.status ?? "ACTIVE",
  };
  if (filter.kind) where.kind = filter.kind;
  if (filter.organizationId) where.organizationId = filter.organizationId;
  if (filter.tag) where.tags = { has: filter.tag };
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: "insensitive" } },
      { title: { contains: filter.q, mode: "insensitive" } },
      { email: { contains: filter.q, mode: "insensitive" } },
      { organizationName: { contains: filter.q, mode: "insensitive" } },
      { organization: { name: { contains: filter.q, mode: "insensitive" } } },
    ];
  }
  const orderBy: Prisma.DirectoryContactOrderByWithRelationInput =
    filter.sortBy === "updatedAt"
      ? { updatedAt: filter.sortDir }
      : filter.sortBy === "createdAt"
        ? { createdAt: filter.sortDir }
        : { name: filter.sortDir };

  return guard("contactList", () =>
    prisma.directoryContact.findMany({
      where,
      orderBy,
      include: { organization: true },
    }),
  );
}

export async function getDirectoryContact(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const contact = await guard("contactGet", () =>
    prisma.directoryContact.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: { organization: true },
    }),
  );
  if (!contact) throw new NotFoundError("Contact not found");
  return contact;
}

export async function createDirectoryContact(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE);
  const input = parseOrThrow(createDirectoryContactSchema, rawInput);

  return guard("contactCreate", () =>
    prisma.$transaction(async (tx) => {
      await assertOrganizationInTenant(tx, ctx, input.organizationId);
      const created = await tx.directoryContact.create({
        data: {
          ...toWriteData(input),
          name: input.name,
          tags: input.tags ?? [],
          hubOrganizationId: ctx.tenantOrgId,
          sourceApp: ctx.sourceApp ?? "bizops",
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "directory.contact_created",
        entityType: "DirectoryContact",
        entityId: created.id,
        summary: `Added ${created.name} to the directory`,
      });
      return created;
    }),
  );
}

export async function updateDirectoryContact(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE);
  const input = parseOrThrow(updateDirectoryContactSchema, rawInput);

  return guard("contactUpdate", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.directoryContact.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Contact not found");
      await assertOrganizationInTenant(tx, ctx, input.organizationId);
      const updated = await tx.directoryContact.update({
        where: { id: existing.id },
        data: { ...toWriteData(input), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "directory.contact_updated",
        entityType: "DirectoryContact",
        entityId: updated.id,
        summary: `Updated directory contact ${updated.name}`,
      });
      return updated;
    }),
  );
}

/** A linked organization must exist in the caller's tenant — a foreign org id
 * would otherwise let a caller attach contacts across tenant boundaries. */
async function assertOrganizationInTenant(
  tx: Prisma.TransactionClient,
  ctx: GovConContext,
  organizationId: string | null | undefined,
): Promise<void> {
  if (!organizationId) return;
  const org = await tx.directoryOrganization.findFirst({
    where: { id: organizationId, hubOrganizationId: ctx.tenantOrgId },
    select: { id: true },
  });
  if (!org) {
    throw new ValidationError("Unknown organization", {
      issues: { organizationId: ["Organization not found in this workspace"] },
    });
  }
}
