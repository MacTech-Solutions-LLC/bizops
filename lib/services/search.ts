/**
 * Tenant-safe global search. Every query is scoped to `ctx.tenantOrgId` and
 * gated by GOVCON_VIEW. Results are typed and deep-linkable.
 */

import { prisma } from "@/lib/db/prisma";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type SearchResultType =
  | "opportunity"
  | "sbir"
  | "agency"
  | "partner"
  | "contact"
  | "task"
  | "vehicle";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function search(ctx: GovConContext, query: string): Promise<SearchResult[]> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const q = query.trim();
  if (q.length < 2) return [];
  const org = ctx.tenantOrgId;
  const contains = { contains: q, mode: "insensitive" as const };
  const take = 6;

  try {
    const [opps, sbir, agencies, partners, contacts, tasks, vehicles] = await Promise.all([
      prisma.govConOpportunity.findMany({
        where: {
          hubOrganizationId: org,
          OR: [
            { internalName: contains },
            { solicitationTitle: contains },
            { solicitationNumber: contains },
            { noticeId: contains },
          ],
        },
        select: { id: true, internalName: true, solicitationNumber: true, stage: true },
        take,
      }),
      prisma.govConSbirTopic.findMany({
        where: {
          hubOrganizationId: org,
          OR: [{ topicTitle: contains }, { topicNumber: contains }],
        },
        select: { id: true, topicTitle: true, topicNumber: true },
        take,
      }),
      prisma.govConAgency.findMany({
        where: { hubOrganizationId: org, OR: [{ name: contains }, { abbreviation: contains }] },
        select: { id: true, name: true, abbreviation: true },
        take,
      }),
      prisma.govConPartner.findMany({
        where: { hubOrganizationId: org, OR: [{ legalName: contains }, { dba: contains }] },
        select: { id: true, legalName: true, businessSize: true },
        take,
      }),
      prisma.govConContact.findMany({
        where: { hubOrganizationId: org, OR: [{ name: contains }, { organizationName: contains }] },
        select: { id: true, name: true, title: true },
        take,
      }),
      prisma.govConTask.findMany({
        where: { hubOrganizationId: org, title: contains },
        select: { id: true, title: true, status: true },
        take,
      }),
      prisma.govConContractVehicle.findMany({
        where: { hubOrganizationId: org, name: contains },
        select: { id: true, name: true, vehicleType: true },
        take,
      }),
    ]);

    const results: SearchResult[] = [];
    for (const o of opps)
      results.push({
        type: "opportunity",
        id: o.id,
        title: o.internalName,
        subtitle: o.solicitationNumber ?? o.stage,
        href: `/opportunities/${o.id}`,
      });
    for (const s of sbir)
      results.push({
        type: "sbir",
        id: s.id,
        title: s.topicTitle,
        subtitle: s.topicNumber,
        href: `/sbir/${s.id}`,
      });
    for (const a of agencies)
      results.push({
        type: "agency",
        id: a.id,
        title: a.name,
        subtitle: a.abbreviation ?? undefined,
        href: `/contacts?agencyId=${a.id}`,
      });
    for (const p of partners)
      results.push({
        type: "partner",
        id: p.id,
        title: p.legalName,
        subtitle: p.businessSize,
        href: `/partners/${p.id}`,
      });
    for (const c of contacts)
      results.push({
        type: "contact",
        id: c.id,
        title: c.name,
        subtitle: c.title ?? undefined,
        href: `/contacts/${c.id}`,
      });
    for (const t of tasks)
      results.push({
        type: "task",
        id: t.id,
        title: t.title,
        subtitle: t.status,
        href: `/tasks?focus=${t.id}`,
      });
    for (const v of vehicles)
      results.push({
        type: "vehicle",
        id: v.id,
        title: v.name,
        subtitle: v.vehicleType ?? undefined,
        href: `/vehicles/${v.id}`,
      });
    return results;
  } catch (err) {
    logger.exception("search_failed", err, { org });
    throw new OperationalError("Search failed", { cause: err });
  }
}
