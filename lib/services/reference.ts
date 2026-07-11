/** Reference-data reads for filters and form dropdowns. Tenant-scoped. */

import { prisma } from "@/lib/db/prisma";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";

export async function listAgencyOptions(ctx: GovConContext) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.govConAgency.findMany({
    where: { hubOrganizationId: ctx.tenantOrgId },
    select: { id: true, name: true, abbreviation: true },
    orderBy: { name: "asc" },
  });
}

export async function listVehicleOptions(ctx: GovConContext) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.govConContractVehicle.findMany({
    where: { hubOrganizationId: ctx.tenantOrgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listOfficeOptions(ctx: GovConContext, agencyId?: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.govConOffice.findMany({
    where: { hubOrganizationId: ctx.tenantOrgId, ...(agencyId ? { agencyId } : {}) },
    select: { id: true, name: true, agencyId: true },
    orderBy: { name: "asc" },
  });
}

export async function listPartnerOptions(ctx: GovConContext) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.govConPartner.findMany({
    where: { hubOrganizationId: ctx.tenantOrgId, archivedAt: null },
    select: { id: true, legalName: true },
    orderBy: { legalName: "asc" },
  });
}
