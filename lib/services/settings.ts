/** Organization settings — reuses the retained CompanyProfile for GovCon identity. */

import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { parseOrThrow } from "@/lib/validation/parse";
import { companyProfileSchema } from "@/lib/validation/settings";

export async function getCompanyProfile(ctx: GovConContext) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.companyProfile.findUnique({
    where: { hubOrganizationId: ctx.tenantOrgId },
  });
}

export async function upsertCompanyProfile(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ADMIN);
  const input = parseOrThrow(companyProfileSchema, rawInput);
  return prisma.$transaction(async (tx) => {
    const saved = await tx.companyProfile.upsert({
      where: { hubOrganizationId: ctx.tenantOrgId },
      create: {
        hubOrganizationId: ctx.tenantOrgId,
        legalName: input.legalName,
        dba: input.dba ?? null,
        cageCode: input.cageCode ?? null,
        uei: input.uei ?? null,
        naicsPrimary: input.naicsPrimary ?? null,
      },
      update: {
        legalName: input.legalName,
        dba: input.dba ?? null,
        cageCode: input.cageCode ?? null,
        uei: input.uei ?? null,
        naicsPrimary: input.naicsPrimary ?? null,
      },
    });
    await recordAudit(tx, ctx, {
      action: "settings.company_profile_updated",
      eventCategory: "org",
      entityType: "CompanyProfile",
      entityId: saved.id,
      summary: `Updated company profile “${saved.legalName}”`,
      after: { legalName: saved.legalName, cageCode: saved.cageCode, uei: saved.uei },
    });
    return saved;
  });
}
