/**
 * Teaming partner service — partner records, their contacts, and a capability
 * gap/comparison matrix. Follows the GovCon service contract (context +
 * permission gate + tenant filter + audited transactional mutations).
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
  createPartnerContactSchema,
  createPartnerSchema,
  partnerFilterSchema,
  updatePartnerContactSchema,
  updatePartnerSchema,
  type PartnerFilter,
} from "@/lib/validation/partner";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("partner_service_failed", err, { op });
    throw new OperationalError("Partner operation failed", { cause: err });
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

export async function listPartners(ctx: GovConContext, rawFilter: unknown = {}) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter: PartnerFilter = parseOrThrow(partnerFilterSchema, rawFilter);

  const where: Prisma.GovConPartnerWhereInput = {
    hubOrganizationId: ctx.tenantOrgId,
    ...(filter.includeArchived ? {} : { archivedAt: null }),
  };
  if (filter.businessSize) where.businessSize = filter.businessSize;
  if (filter.q) {
    where.OR = [
      { legalName: { contains: filter.q, mode: "insensitive" } },
      { dba: { contains: filter.q, mode: "insensitive" } },
      { uei: { contains: filter.q, mode: "insensitive" } },
      { cageCode: { contains: filter.q, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.GovConPartnerOrderByWithRelationInput =
    filter.sortBy === "updatedAt"
      ? { updatedAt: filter.sortDir }
      : filter.sortBy === "businessSize"
        ? { businessSize: filter.sortDir }
        : { legalName: filter.sortDir };

  return guard("list", () =>
    prisma.govConPartner.findMany({
      where,
      orderBy,
      include: { _count: { select: { contacts: true, opportunityPartners: true } } },
    }),
  );
}

export async function getPartner(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const partner = await guard("get", () =>
    prisma.govConPartner.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: {
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        opportunityPartners: { include: { opportunity: true } },
        documents: true,
      },
    }),
  );
  if (!partner) throw new NotFoundError("Partner not found");
  return partner;
}

export async function createPartner(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  const input = parseOrThrow(createPartnerSchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.govConPartner.create({
        data: {
          ...toWriteData(input),
          legalName: input.legalName,
          hubOrganizationId: ctx.tenantOrgId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "partner.created",
        entityType: "GovConPartner",
        entityId: created.id,
        summary: `Added teaming partner “${created.legalName}”`,
      });
      return created;
    }),
  );
}

export async function updatePartner(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  const input = parseOrThrow(updatePartnerSchema, rawInput);

  return guard("update", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConPartner.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Partner not found");
      const updated = await tx.govConPartner.update({
        where: { id: existing.id },
        data: { ...toWriteData(input), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "partner.updated",
        entityType: "GovConPartner",
        entityId: updated.id,
        summary: `Updated teaming partner “${updated.legalName}”`,
      });
      return updated;
    }),
  );
}

export async function archivePartner(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  return guard("archive", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConPartner.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Partner not found");
      const updated = await tx.govConPartner.update({
        where: { id: existing.id },
        data: { archivedAt: new Date(), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "partner.archived",
        entityType: "GovConPartner",
        entityId: updated.id,
        summary: `Archived teaming partner “${updated.legalName}”`,
      });
      return updated;
    }),
  );
}

// --- Partner contacts -------------------------------------------------------

async function assertPartner(tx: Prisma.TransactionClient, ctx: GovConContext, partnerId: string) {
  const partner = await tx.govConPartner.findFirst({
    where: { id: partnerId, hubOrganizationId: ctx.tenantOrgId },
  });
  if (!partner) throw new NotFoundError("Partner not found");
  return partner;
}

export async function createPartnerContact(
  ctx: GovConContext,
  partnerId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  const input = parseOrThrow(createPartnerContactSchema, rawInput);

  return guard("createContact", () =>
    prisma.$transaction(async (tx) => {
      await assertPartner(tx, ctx, partnerId);
      const created = await tx.govConPartnerContact.create({
        data: {
          ...toWriteData(input),
          name: input.name,
          partnerId,
          hubOrganizationId: ctx.tenantOrgId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "partner_contact.created",
        entityType: "GovConPartnerContact",
        entityId: created.id,
        summary: `Added partner contact ${created.name}`,
      });
      return created;
    }),
  );
}

export async function updatePartnerContact(
  ctx: GovConContext,
  contactId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  const input = parseOrThrow(updatePartnerContactSchema, rawInput);

  return guard("updateContact", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConPartnerContact.findFirst({
        where: { id: contactId, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Partner contact not found");
      const updated = await tx.govConPartnerContact.update({
        where: { id: existing.id },
        data: toWriteData(input),
      });
      await recordAudit(tx, ctx, {
        action: "partner_contact.updated",
        entityType: "GovConPartnerContact",
        entityId: updated.id,
        summary: `Updated partner contact ${updated.name}`,
      });
      return updated;
    }),
  );
}

export async function deletePartnerContact(ctx: GovConContext, contactId: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);
  return guard("deleteContact", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConPartnerContact.findFirst({
        where: { id: contactId, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Partner contact not found");
      await tx.govConPartnerContact.delete({ where: { id: existing.id } });
      await recordAudit(tx, ctx, {
        action: "partner_contact.deleted",
        entityType: "GovConPartnerContact",
        entityId: existing.id,
        summary: `Removed partner contact ${existing.name}`,
      });
      return existing;
    }),
  );
}

// --- Comparison matrix ------------------------------------------------------

export interface PartnerComparisonRow {
  label: string;
  presence: boolean[];
}
export interface PartnerComparison {
  partners: Array<{
    id: string;
    legalName: string;
    businessSize: string;
    facilityClearance: string | null;
    ndaStatus: string;
    teamingStatus: string;
    subcontractStatus: string;
  }>;
  socioeconomic: PartnerComparisonRow[];
  capabilities: PartnerComparisonRow[];
  vehicles: PartnerComparisonRow[];
  agreements: Array<{ label: string; statuses: string[] }>;
}

/**
 * Side-by-side gap matrix across the requested partners. Rows are the union of
 * each attribute value (socioeconomic status, NAICS capability, vehicle) and the
 * `presence` array indicates, per partner column, whether they carry it.
 */
export async function comparePartners(
  ctx: GovConContext,
  ids: string[],
): Promise<PartnerComparison> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const unique = [...new Set(ids)].filter(Boolean);

  return guard("compare", async () => {
    const rows = await prisma.govConPartner.findMany({
      where: { id: { in: unique }, hubOrganizationId: ctx.tenantOrgId },
    });
    // Preserve the requested ordering.
    const ordered = unique
      .map((id) => rows.find((r) => r.id === id))
      .filter((r): r is (typeof rows)[number] => Boolean(r));

    const buildRows = (pick: (p: (typeof rows)[number]) => string[]): PartnerComparisonRow[] => {
      const values = [...new Set(ordered.flatMap(pick))].sort((a, b) => a.localeCompare(b));
      return values.map((label) => ({
        label,
        presence: ordered.map((p) => pick(p).includes(label)),
      }));
    };

    return {
      partners: ordered.map((p) => ({
        id: p.id,
        legalName: p.legalName,
        businessSize: p.businessSize,
        facilityClearance: p.facilityClearance,
        ndaStatus: p.ndaStatus,
        teamingStatus: p.teamingStatus,
        subcontractStatus: p.subcontractStatus,
      })),
      socioeconomic: buildRows((p) => p.socioeconomicStatus),
      capabilities: buildRows((p) => p.naicsCapabilities),
      vehicles: buildRows((p) => p.contractVehicles),
      agreements: [
        { label: "NDA", statuses: ordered.map((p) => p.ndaStatus) },
        { label: "Teaming", statuses: ordered.map((p) => p.teamingStatus) },
        { label: "Subcontract", statuses: ordered.map((p) => p.subcontractStatus) },
      ],
    };
  });
}
