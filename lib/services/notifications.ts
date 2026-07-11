/** Notification service — tenant + recipient scoped. */

import { prisma } from "@/lib/db/prisma";
import type { GovConContext } from "@/lib/authz";
import { logger } from "@/lib/logger";

/** Count unread notifications for the current actor. Never throws — a shell
 * badge must not break the page; logs and returns 0 on failure. */
export async function countUnread(ctx: GovConContext): Promise<number> {
  try {
    return await prisma.govConNotification.count({
      where: { hubOrganizationId: ctx.tenantOrgId, recipientId: ctx.actorHubUserId, readAt: null },
    });
  } catch (err) {
    logger.exception("notification_count_failed", err, { org: ctx.tenantOrgId });
    return 0;
  }
}

export async function listNotifications(ctx: GovConContext, limit = 50) {
  return prisma.govConNotification.findMany({
    where: { hubOrganizationId: ctx.tenantOrgId, recipientId: ctx.actorHubUserId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markAllRead(ctx: GovConContext): Promise<number> {
  const res = await prisma.govConNotification.updateMany({
    where: { hubOrganizationId: ctx.tenantOrgId, recipientId: ctx.actorHubUserId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

export async function markRead(ctx: GovConContext, id: string): Promise<void> {
  await prisma.govConNotification.updateMany({
    where: { id, hubOrganizationId: ctx.tenantOrgId, recipientId: ctx.actorHubUserId },
    data: { readAt: new Date() },
  });
}
