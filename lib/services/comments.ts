/**
 * Comment service — threaded collaboration with @mentions.
 *
 * Any viewer (`GOVCON_VIEW`) can read and author comments. Creating a comment
 * parses @mentions from the body (`@[name](hubUserId)`) plus any explicit
 * `mentionedUserIds`, writes a `GovConMention` per unique mentioned user, and
 * raises a MENTION notification for each (never the author) — all atomically,
 * followed by an audit event.
 */

import { Prisma, type GovConComment } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  commentTargetSchema,
  createCommentSchema,
  type CommentTarget,
} from "@/lib/validation/comment";

/** `@[Display Name](hubUserId)` — the second group is the Hub user id. */
const MENTION_PATTERN = /@\[[^\]]+\]\(([^)]+)\)/g;

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("comment_service_failed", err, { op });
    throw new OperationalError("Comment operation failed", { cause: err });
  }
}

/** Extract unique mentioned Hub user ids from the body markup + explicit list. */
export function extractMentions(body: string, explicit?: string[]): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const id = match[1]?.trim();
    if (id) ids.add(id);
  }
  for (const id of explicit ?? []) {
    const trimmed = id.trim();
    if (trimmed) ids.add(trimmed);
  }
  return [...ids];
}

function targetWhere(target: CommentTarget): Prisma.GovConCommentWhereInput {
  if (target.taskId) return { taskId: target.taskId };
  if (target.opportunityId) return { opportunityId: target.opportunityId };
  return { entityType: target.entityType, entityId: target.entityId };
}

/**
 * List comments for a target, threaded: top-level comments (newest first) each
 * with their replies (oldest first) and mentions.
 */
export async function listComments(ctx: GovConContext, rawTarget: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const target = parseOrThrow(commentTargetSchema, rawTarget);
  return guard("list", () =>
    prisma.govConComment.findMany({
      where: {
        hubOrganizationId: ctx.tenantOrgId,
        parentCommentId: null,
        ...targetWhere(target),
      },
      orderBy: { createdAt: "desc" },
      include: {
        mentions: true,
        replies: {
          orderBy: { createdAt: "asc" },
          include: { mentions: true },
        },
      },
    }),
  );
}

export async function createComment(ctx: GovConContext, rawInput: unknown): Promise<GovConComment> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const input = parseOrThrow(createCommentSchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      // Verify the target belongs to this tenant so comments never cross tenants.
      let opportunityId: string | null = input.opportunityId ?? null;
      if (input.opportunityId) {
        const opp = await tx.govConOpportunity.findFirst({
          where: { id: input.opportunityId, hubOrganizationId: ctx.tenantOrgId },
          select: { id: true },
        });
        if (!opp) throw new NotFoundError("Opportunity not found");
      }
      if (input.taskId) {
        const task = await tx.govConTask.findFirst({
          where: { id: input.taskId, hubOrganizationId: ctx.tenantOrgId },
          select: { id: true, opportunityId: true },
        });
        if (!task) throw new NotFoundError("Task not found");
        // Carry the task's pursuit onto the comment/notifications for context.
        opportunityId = opportunityId ?? task.opportunityId;
      }
      if (input.parentCommentId) {
        const parent = await tx.govConComment.findFirst({
          where: { id: input.parentCommentId, hubOrganizationId: ctx.tenantOrgId },
          select: { id: true },
        });
        if (!parent) throw new NotFoundError("Parent comment not found");
      }

      const created = await tx.govConComment.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          authorId: ctx.actorHubUserId,
          body: input.body,
          opportunityId: input.opportunityId ?? null,
          taskId: input.taskId ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          parentCommentId: input.parentCommentId ?? null,
        },
      });

      const mentioned = extractMentions(input.body, input.mentionedUserIds).filter(
        (id) => id !== ctx.actorHubUserId,
      );
      if (mentioned.length > 0) {
        await tx.govConMention.createMany({
          data: mentioned.map((mentionedUserId) => ({
            hubOrganizationId: ctx.tenantOrgId,
            commentId: created.id,
            mentionedUserId,
          })),
        });
        await tx.govConNotification.createMany({
          data: mentioned.map((recipientId) => ({
            hubOrganizationId: ctx.tenantOrgId,
            recipientId,
            type: "MENTION" as const,
            title: "You were mentioned in a comment",
            body: input.body.slice(0, 280),
            entityType: input.taskId ? "GovConTask" : input.entityType ?? "GovConComment",
            entityId: input.taskId ?? input.entityId ?? created.id,
            opportunityId,
            link: commentLink(input),
            actorId: ctx.actorHubUserId,
          })),
        });
      }

      await recordAudit(tx, ctx, {
        action: "comment.added",
        entityType: "GovConComment",
        entityId: created.id,
        opportunityId,
        summary: "Added a comment",
        metadata: { mentionedCount: mentioned.length },
      });
      return created;
    }),
  );
}

function commentLink(input: { taskId?: string | null; opportunityId?: string | null }): string | null {
  if (input.taskId) return `/tasks?task=${input.taskId}`;
  if (input.opportunityId) return `/opportunities/${input.opportunityId}`;
  return null;
}
