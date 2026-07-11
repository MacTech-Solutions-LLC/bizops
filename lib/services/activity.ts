/** Activity feed — tenant-scoped read of the append-only activity log. */

import { prisma } from "@/lib/db/prisma";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";

export async function listActivity(
  ctx: GovConContext,
  opts: { opportunityId?: string; limit?: number } = {},
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.govConActivityEvent.findMany({
    where: {
      hubOrganizationId: ctx.tenantOrgId,
      ...(opts.opportunityId ? { opportunityId: opts.opportunityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 30,
    include: { opportunity: { select: { id: true, internalName: true } } },
  });
}
