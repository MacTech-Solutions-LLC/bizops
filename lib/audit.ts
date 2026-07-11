/**
 * Audit trail.
 *
 * Two destinations for every material mutation:
 *  1. A local `GovConActivityEvent` row — the in-app Activity feed and local
 *     evidence. Written inside the caller's transaction so it is atomic with the
 *     change it records.
 *  2. The MacTech Hub central audit authority (append-only) via
 *     `emitHubAuditEvent` — only in live mode. Forwarding is best-effort and
 *     never blocks the user path; a failure is logged as a compliance event.
 *
 * There is intentionally no audit delete path.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { createHubServiceClient, type HubAuditEventInput } from "@mactech/hub-client";
import type { GovConContext } from "@/lib/authz";
import { APP_KEY, getHubAuthorityMode } from "@/lib/hub/client";
import { logger } from "@/lib/logger";

export type AuditCategory = HubAuditEventInput["eventCategory"];

/** A Prisma client or an interactive-transaction client. */
export type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  /** Dotted action, e.g. "opportunity.stage_changed". */
  action: string;
  /** Hub audit category. Business events default to "capture". */
  eventCategory?: AuditCategory;
  severity?: "info" | "warning" | "critical";
  entityType: string;
  entityId: string;
  opportunityId?: string | null;
  summary?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
}

/**
 * Record an audit event: write the local activity row (in the given db/tx) and
 * forward to the Hub in live mode. Local write failures propagate (they are part
 * of the transaction); Hub forwarding failures are swallowed after logging.
 */
export async function recordAudit(
  db: Db,
  ctx: GovConContext,
  input: AuditInput,
): Promise<void> {
  await db.govConActivityEvent.create({
    data: {
      hubOrganizationId: ctx.tenantOrgId,
      actorId: ctx.actorHubUserId,
      action: input.action,
      eventCategory: input.eventCategory ?? "capture",
      entityType: input.entityType,
      entityId: input.entityId,
      opportunityId: input.opportunityId ?? null,
      summary: input.summary ?? null,
      beforeJson: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
      afterJson: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
      requestId: input.requestId ?? null,
    },
  });

  // Forward to the Hub only in live mode; failures must not break the request.
  if (getHubAuthorityMode() === "live") {
    void forwardToHub(ctx, input).catch((err) => {
      logger.exception("hub_audit_forward_failed", err, {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        // Treat a failed forward as a compliance signal for later reconciliation.
        compliance: true,
      });
    });
  }
}

async function forwardToHub(ctx: GovConContext, input: AuditInput): Promise<void> {
  const serviceToken = process.env.MACTECH_HUB_SERVICE_TOKEN;
  if (!serviceToken) return; // no credentials → nothing to forward to
  const client = createHubServiceClient({
    hubBaseUrl:
      process.env.MACTECH_HUB_URL ?? "https://www.suite.mactechsolutionsllc.com",
    sourceAppKey: APP_KEY,
    serviceToken,
  });
  await client.emitHubAuditEvent({
    appKey: APP_KEY,
    eventType: `bizops.${input.action}`,
    eventCategory: input.eventCategory ?? "capture",
    severity: input.severity ?? "info",
    action: input.action,
    actorHubUserId: ctx.actorHubUserId,
    actorClerkUserId: ctx.actorClerkUserId ?? null,
    actorEmail: ctx.actorEmail ?? null,
    organizationId: ctx.tenantOrgId,
    tenantOrgId: ctx.tenantOrgId,
    customerOrgClerkId: ctx.clerkOrgId ?? null,
    objectType: input.entityType,
    objectId: input.entityId,
    beforeJson: input.before ?? null,
    afterJson: input.after ?? null,
    metadata: input.metadata ?? null,
    requestId: input.requestId ?? null,
  });
}
