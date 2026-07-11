/**
 * SBIR/STTR topic + fit-assessment service.
 *
 * Follows the GovCon service contract: every function takes a `GovConContext`,
 * enforces the required permission via `requireGovConPermission`, filters every
 * query by `ctx.tenantOrgId`, and records an audit event for mutations inside a
 * `$transaction`. The weighted fit score is computed by the pure
 * `scoreSbirAssessment` domain function — the number never makes the decision.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { ConflictError, NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import { scoreSbirAssessment, SBIR_CRITERIA_WEIGHTS } from "@/lib/domain/metrics";
import {
  createSbirTopicSchema,
  sbirFilterSchema,
  updateSbirTopicSchema,
  upsertSbirAssessmentSchema,
  type SbirFilter,
} from "@/lib/validation/sbir";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("sbir_service_failed", err, { op });
    throw new OperationalError("SBIR operation failed", { cause: err });
  }
}

function tenantWhere(ctx: GovConContext, includeArchived: boolean): Prisma.GovConSbirTopicWhereInput {
  return {
    hubOrganizationId: ctx.tenantOrgId,
    ...(includeArchived ? {} : { archivedAt: null }),
  };
}

export async function listTopics(ctx: GovConContext, rawFilter: unknown = {}) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter: SbirFilter = parseOrThrow(sbirFilterSchema, rawFilter);

  const where = tenantWhere(ctx, filter.includeArchived);
  if (filter.program) where.program = filter.program;
  if (filter.phase) where.phase = filter.phase;
  if (filter.agencyId) where.agencyId = filter.agencyId;
  if (filter.q) {
    where.OR = [
      { topicNumber: { contains: filter.q, mode: "insensitive" } },
      { topicTitle: { contains: filter.q, mode: "insensitive" } },
      { component: { contains: filter.q, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.GovConSbirTopicOrderByWithRelationInput =
    filter.sortBy === "topicNumber"
      ? { topicNumber: filter.sortDir }
      : filter.sortBy === "updatedAt"
        ? { updatedAt: filter.sortDir }
        : { closeDate: { sort: filter.sortDir, nulls: "last" } };

  return guard("list", () =>
    prisma.govConSbirTopic.findMany({
      where,
      orderBy,
      include: { agency: true, assessment: true },
    }),
  );
}

export async function getTopic(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const topic = await guard("get", () =>
    prisma.govConSbirTopic.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: { agency: true, assessment: true, opportunity: true },
    }),
  );
  if (!topic) throw new NotFoundError("SBIR topic not found");
  return topic;
}

function toWriteData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "expectedVersion") continue;
    if (v === undefined) continue;
    data[k] = v;
  }
  return data;
}

export async function createTopic(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE);
  const input = parseOrThrow(createSbirTopicSchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.govConSbirTopic.create({
        data: {
          ...toWriteData(input),
          topicNumber: input.topicNumber,
          topicTitle: input.topicTitle,
          hubOrganizationId: ctx.tenantOrgId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "sbir_topic.created",
        entityType: "GovConSbirTopic",
        entityId: created.id,
        summary: `Created SBIR topic ${created.topicNumber} — ${created.topicTitle}`,
      });
      return created;
    }),
  );
}

export async function updateTopic(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE);
  const input = parseOrThrow(updateSbirTopicSchema, rawInput);

  return guard("update", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConSbirTopic.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("SBIR topic not found");

      const updated = await tx.govConSbirTopic.update({
        where: { id: existing.id },
        data: { ...toWriteData(input), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "sbir_topic.updated",
        entityType: "GovConSbirTopic",
        entityId: updated.id,
        summary: `Updated SBIR topic ${updated.topicNumber}`,
      });
      return updated;
    }),
  );
}

/**
 * Create or update the fit assessment for a topic. Computes the weighted fit
 * score from the 0..5 criteria and persists it alongside the human
 * recommendation. Optimistic concurrency via the assessment `version`.
 */
export async function upsertAssessment(ctx: GovConContext, topicId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE);
  const input = parseOrThrow(upsertSbirAssessmentSchema, rawInput);

  return guard("upsertAssessment", () =>
    prisma.$transaction(async (tx) => {
      const topic = await tx.govConSbirTopic.findFirst({
        where: { id: topicId, hubOrganizationId: ctx.tenantOrgId },
        include: { assessment: true },
      });
      if (!topic) throw new NotFoundError("SBIR topic not found");

      const existing = topic.assessment;
      if (
        existing &&
        input.expectedVersion !== undefined &&
        input.expectedVersion !== existing.version
      ) {
        throw new ConflictError("This assessment was modified by someone else.", {
          context: { current: existing.version, expected: input.expectedVersion },
        });
      }

      // Merge new scores over any existing ones so the weighted score reflects
      // the full scorecard, not just the fields touched in this edit.
      const scoreKeys = Object.keys(SBIR_CRITERIA_WEIGHTS) as Array<
        keyof typeof SBIR_CRITERIA_WEIGHTS
      >;
      const merged: Record<string, number | null | undefined> = {};
      for (const key of scoreKeys) {
        const incoming = (input as Record<string, unknown>)[key];
        merged[key] =
          incoming !== undefined
            ? (incoming as number | null)
            : ((existing?.[key as keyof typeof existing] as number | null | undefined) ?? undefined);
      }
      const { weightedScore } = scoreSbirAssessment(merged);

      const writeData = toWriteData(input as Record<string, unknown>);
      delete (writeData as Record<string, unknown>).expectedVersion;

      const saved = await tx.govConSbirAssessment.upsert({
        where: { sbirTopicId: topicId },
        create: {
          ...writeData,
          sbirTopicId: topicId,
          hubOrganizationId: ctx.tenantOrgId,
          weightedScore,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
        update: {
          ...writeData,
          weightedScore,
          version: { increment: 1 },
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "sbir_assessment.saved",
        entityType: "GovConSbirAssessment",
        entityId: saved.id,
        summary: `Scored SBIR topic ${topic.topicNumber} — ${Number(saved.weightedScore ?? 0)}/100${
          saved.recommendation ? ` (${saved.recommendation})` : ""
        }`,
        after: {
          weightedScore: Number(saved.weightedScore ?? 0),
          recommendation: saved.recommendation,
        },
      });
      return saved;
    }),
  );
}
