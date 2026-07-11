/**
 * Bid / no-bid decision service.
 *
 * The weighted score is ADVISORY ONLY — it is computed via `scoreBidDecision`
 * and stored alongside criteria, but it never makes the decision. A human with
 * GOVCON_BID_DECISION_APPROVE records the final outcome explicitly via
 * `recordDecision`; the outcome is exactly what the human passes.
 *
 * Read → GOVCON_VIEW. Criteria save + review → GOVCON_BID_DECISION_REVIEW.
 * Final decision → GOVCON_BID_DECISION_APPROVE.
 */

import { Prisma, GovConBidOutcome } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import { scoreBidDecision, type BidCriterion } from "@/lib/domain/metrics";
import {
  BID_CRITERION_MAX,
  defaultBidCriteria,
} from "@/lib/domain/bid-criteria";
import {
  recordDecisionSchema,
  submitReviewSchema,
  upsertBidCriteriaSchema,
} from "@/lib/validation/bid";

const DECISION_INCLUDE = {
  reviews: { orderBy: { updatedAt: "desc" } },
} satisfies Prisma.GovConBidDecisionInclude;

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("bid_decision_service_failed", err, { op });
    throw new OperationalError("Bid decision operation failed", { cause: err });
  }
}

async function requireOpportunity(
  db: Prisma.TransactionClient | typeof prisma,
  ctx: GovConContext,
  opportunityId: string,
) {
  const opp = await db.govConOpportunity.findFirst({
    where: { id: opportunityId, hubOrganizationId: ctx.tenantOrgId },
    select: { id: true, internalName: true },
  });
  if (!opp) throw new NotFoundError("Opportunity not found");
  return opp;
}

/** Read the bid decision (with reviews) for an opportunity, or null. */
export async function getBidDecision(
  ctx: GovConContext,
  opportunityId: string,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return guard("get", async () => {
    await requireOpportunity(prisma, ctx, opportunityId);
    return prisma.govConBidDecision.findUnique({
      where: { opportunityId },
      include: DECISION_INCLUDE,
    });
  });
}

/**
 * List pursuits in the active bid pipeline (BID_NO_BID / PROPOSAL / SUBMITTED /
 * EVALUATION) with their bid-decision status. Used by the Active Bids worklist.
 */
export async function listActiveBidPursuits(ctx: GovConContext) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return guard("listActiveBids", () =>
    prisma.govConOpportunity.findMany({
      where: {
        hubOrganizationId: ctx.tenantOrgId,
        archivedAt: null,
        stage: { in: ["BID_NO_BID", "PROPOSAL", "SUBMITTED", "EVALUATION"] },
      },
      orderBy: [{ proposalDeadline: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      include: {
        agency: true,
        bidDecision: { select: { outcome: true, weightedScore: true, maxScore: true, decidedAt: true } },
      },
    }),
  );
}

/** Create the decision shell if absent; returns its id. Caller in a tx. */
async function ensureDecisionId(
  tx: Prisma.TransactionClient,
  ctx: GovConContext,
  opportunityId: string,
): Promise<string> {
  await requireOpportunity(tx, ctx, opportunityId);
  const existing = await tx.govConBidDecision.findUnique({
    where: { opportunityId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.govConBidDecision.create({
    data: {
      hubOrganizationId: ctx.tenantOrgId,
      opportunityId,
      criteriaJson: defaultBidCriteria() as unknown as Prisma.InputJsonValue,
      createdBy: ctx.actorHubUserId,
      updatedBy: ctx.actorHubUserId,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Store the scorecard criteria and compute the ADVISORY weighted score. Never
 * touches `outcome` — a human records that separately.
 */
export async function upsertBidDecisionCriteria(
  ctx: GovConContext,
  opportunityId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_BID_DECISION_REVIEW);
  const { criteria } = parseOrThrow(upsertBidCriteriaSchema, { criteria: rawInput });

  const scoringInput: BidCriterion[] = criteria.map((c) => ({
    key: c.key,
    weight: c.weight,
    score: c.score,
    max: c.max ?? BID_CRITERION_MAX,
  }));
  const result = scoreBidDecision(scoringInput);

  return guard("upsertCriteria", () =>
    prisma.$transaction(async (tx) => {
      const decisionId = await ensureDecisionId(tx, ctx, opportunityId);
      const updated = await tx.govConBidDecision.update({
        where: { id: decisionId },
        data: {
          criteriaJson: scoringInput as unknown as Prisma.InputJsonValue,
          weightedScore: new Prisma.Decimal(result.weightedScore),
          maxScore: new Prisma.Decimal(result.maxScore),
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
        },
        include: DECISION_INCLUDE,
      });
      await recordAudit(tx, ctx, {
        action: "bid.criteria_updated",
        entityType: "GovConBidDecision",
        entityId: updated.id,
        opportunityId,
        summary: `Scored bid criteria (advisory ${result.weightedScore}/${result.maxScore})`,
        after: { weightedScore: result.weightedScore, maxScore: result.maxScore, percent: result.percent },
      });
      return updated;
    }),
  );
}

/** Upsert a reviewer's vote (unique per bidDecisionId + reviewerId). */
export async function submitReview(
  ctx: GovConContext,
  opportunityId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_BID_DECISION_REVIEW);
  const input = parseOrThrow(submitReviewSchema, rawInput);

  return guard("submitReview", () =>
    prisma.$transaction(async (tx) => {
      const decisionId = await ensureDecisionId(tx, ctx, opportunityId);
      const review = await tx.govConBidDecisionReview.upsert({
        where: {
          bidDecisionId_reviewerId: {
            bidDecisionId: decisionId,
            reviewerId: input.reviewerId,
          },
        },
        create: {
          hubOrganizationId: ctx.tenantOrgId,
          bidDecisionId: decisionId,
          reviewerId: input.reviewerId,
          vote: input.vote,
          score: input.score === null ? null : new Prisma.Decimal(input.score),
          comments: input.comments ?? null,
          approved: input.approved,
          reviewedAt: new Date(),
        },
        update: {
          vote: input.vote,
          score: input.score === null ? null : new Prisma.Decimal(input.score),
          comments: input.comments ?? null,
          approved: input.approved,
          reviewedAt: new Date(),
        },
      });
      await recordAudit(tx, ctx, {
        action: "bid.review_submitted",
        entityType: "GovConBidDecisionReview",
        entityId: review.id,
        opportunityId,
        summary: `Reviewer ${input.reviewerId} voted ${input.vote}`,
        after: { vote: input.vote, approved: input.approved },
      });
      return review;
    }),
  );
}

/**
 * Record the FINAL decision. Requires GOVCON_BID_DECISION_APPROVE. The `outcome`
 * is exactly what the human passes — it is never derived from the weighted
 * score. Sets decidedBy / decidedAt.
 */
export async function recordDecision(
  ctx: GovConContext,
  opportunityId: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_BID_DECISION_APPROVE);
  const input = parseOrThrow(recordDecisionSchema, rawInput);

  return guard("recordDecision", () =>
    prisma.$transaction(async (tx) => {
      const decisionId = await ensureDecisionId(tx, ctx, opportunityId);
      const existing = await tx.govConBidDecision.findUnique({ where: { id: decisionId } });
      const updated = await tx.govConBidDecision.update({
        where: { id: decisionId },
        data: {
          outcome: input.outcome,
          rationale: input.rationale ?? null,
          ...(input.requiredApprovers !== undefined
            ? { requiredApprovers: input.requiredApprovers }
            : {}),
          decidedBy: ctx.actorHubUserId,
          decidedAt: new Date(),
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
        },
        include: DECISION_INCLUDE,
      });
      await recordAudit(tx, ctx, {
        action: "bid.decision_recorded",
        entityType: "GovConBidDecision",
        entityId: updated.id,
        opportunityId,
        severity: "info",
        summary: `Bid decision recorded: ${input.outcome}`,
        before: { outcome: existing?.outcome ?? null },
        after: { outcome: input.outcome, decidedBy: ctx.actorHubUserId },
      });
      return updated;
    }),
  );
}
