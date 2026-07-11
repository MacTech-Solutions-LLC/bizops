/**
 * Opportunity service — the core GovCon pursuit lifecycle.
 *
 * Every function:
 *  - takes a `GovConContext` and enforces the required permission via
 *    `requireGovConPermission` (server-side, not UI hiding),
 *  - filters every query by `ctx.tenantOrgId` (no cross-tenant reads),
 *  - records an audit event for material mutations inside the transaction,
 *  - surfaces operational failures as errors (never silent empty data).
 */

import { Prisma, type GovConOpportunity, type GovConStage } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import {
  requireGovConPermission,
  type GovConContext,
} from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { ConflictError, NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  changeStageSchema,
  createOpportunitySchema,
  opportunityFilterSchema,
  updateOpportunitySchema,
  type OpportunityFilter,
} from "@/lib/validation/opportunity";
import {
  QUALIFIED_STAGES,
  isClosedStage,
  rollupByStage,
  toNumber,
  weightedValue,
  winRate,
} from "@/lib/domain/metrics";

/** Fields only editable with financial permission. */
const FINANCIAL_FIELDS = [
  "estimatedValue",
  "minValue",
  "maxValue",
  "ceiling",
  "fundedValue",
] as const;

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Wrap unexpected Prisma failures as OperationalError (503) with logging. */
async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Re-throw our own structured errors untouched.
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("opportunity_service_failed", err, { op });
    throw new OperationalError("Opportunity operation failed", { cause: err });
  }
}

function tenantWhere(ctx: GovConContext, includeArchived: boolean): Prisma.GovConOpportunityWhereInput {
  return {
    hubOrganizationId: ctx.tenantOrgId,
    ...(includeArchived ? {} : { archivedAt: null }),
  };
}

export async function listOpportunities(
  ctx: GovConContext,
  rawFilter: unknown = {},
): Promise<ListResult<GovConOpportunity>> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter = parseOrThrow(opportunityFilterSchema, rawFilter);

  const where = buildWhere(ctx, filter);
  const orderBy = buildOrderBy(filter);
  const skip = (filter.page - 1) * filter.pageSize;

  return guard("list", async () => {
    const [items, total] = await Promise.all([
      prisma.govConOpportunity.findMany({
        where,
        orderBy,
        skip,
        take: filter.pageSize,
        include: { agency: true, office: true },
      }),
      prisma.govConOpportunity.count({ where }),
    ]);
    return {
      items,
      total,
      page: filter.page,
      pageSize: filter.pageSize,
      pageCount: Math.max(1, Math.ceil(total / filter.pageSize)),
    };
  });
}

function buildWhere(
  ctx: GovConContext,
  filter: OpportunityFilter,
): Prisma.GovConOpportunityWhereInput {
  const where: Prisma.GovConOpportunityWhereInput = tenantWhere(ctx, filter.includeArchived);
  if (filter.stage) {
    where.stage = Array.isArray(filter.stage) ? { in: filter.stage } : filter.stage;
  }
  if (filter.health) where.health = filter.health;
  if (filter.priority) where.priority = filter.priority;
  if (filter.type) where.type = filter.type;
  if (filter.agencyId) where.agencyId = filter.agencyId;
  if (filter.teamRole) where.teamRole = filter.teamRole;
  if (filter.captureOwnerId) where.captureOwnerId = filter.captureOwnerId;
  if (filter.q) {
    const q = filter.q;
    where.OR = [
      { internalName: { contains: q, mode: "insensitive" } },
      { solicitationTitle: { contains: q, mode: "insensitive" } },
      { solicitationNumber: { contains: q, mode: "insensitive" } },
      { noticeId: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

function buildOrderBy(
  filter: OpportunityFilter,
): Prisma.GovConOpportunityOrderByWithRelationInput {
  const dir = filter.sortDir;
  switch (filter.sortBy) {
    case "estimatedValue":
      return { estimatedValue: dir };
    case "pWin":
      return { pWin: dir };
    case "stage":
      return { stage: dir };
    case "updatedAt":
      return { updatedAt: dir };
    case "internalName":
      return { internalName: dir };
    case "proposalDeadline":
    default:
      // Nulls last for ascending deadline sorting.
      return { proposalDeadline: { sort: dir, nulls: "last" } };
  }
}

const DETAIL_INCLUDE = {
  agency: true,
  office: true,
  vehicle: true,
  capturePlan: { include: { sections: { orderBy: { orderIndex: "asc" } } } },
  bidDecision: { include: { reviews: true } },
  milestones: { orderBy: { dueAt: "asc" } },
  partners: { include: { partner: true } },
  risks: true,
  submission: true,
  outcome: true,
  tags: { include: { tag: true } },
  stageHistory: { orderBy: { createdAt: "desc" }, take: 50 },
} satisfies Prisma.GovConOpportunityInclude;

export async function getOpportunity(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const opp = await guard("get", () =>
    prisma.govConOpportunity.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: DETAIL_INCLUDE,
    }),
  );
  if (!opp) throw new NotFoundError("Opportunity not found");
  return opp;
}

export async function createOpportunity(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CREATE);
  const input = parseOrThrow(createOpportunitySchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.govConOpportunity.create({
        data: {
          ...toWriteData(input),
          internalName: input.internalName,
          hubOrganizationId: ctx.tenantOrgId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
          lastActivityAt: new Date(),
        },
      });
      await tx.govConOpportunityStageHistory.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          opportunityId: created.id,
          fromStage: null,
          toStage: created.stage,
          changedBy: ctx.actorHubUserId,
          note: "Opportunity created",
        },
      });
      await recordAudit(tx, ctx, {
        action: "opportunity.created",
        entityType: "GovConOpportunity",
        entityId: created.id,
        opportunityId: created.id,
        summary: `Created opportunity “${created.internalName}”`,
        after: auditSnapshot(created),
      });
      return created;
    }),
  );
}

export async function updateOpportunity(
  ctx: GovConContext,
  id: string,
  rawInput: unknown,
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EDIT);
  const input = parseOrThrow(updateOpportunitySchema, rawInput);

  return guard("update", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConOpportunity.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Opportunity not found");
      assertVersion(existing.version, input.expectedVersion);

      const data = toWriteData(input);
      // Financial edits require the financial permission.
      const touchesFinancials = FINANCIAL_FIELDS.some((f) => f in data);
      if (touchesFinancials) {
        requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_FINANCIAL_EDIT);
      }

      const updated = await tx.govConOpportunity.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });

      await recordAudit(tx, ctx, {
        action: "opportunity.updated",
        entityType: "GovConOpportunity",
        entityId: updated.id,
        opportunityId: updated.id,
        summary: `Updated opportunity “${updated.internalName}”`,
        before: auditSnapshot(existing),
        after: auditSnapshot(updated),
      });
      return updated;
    }),
  );
}

export async function changeStage(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EDIT);
  const input = parseOrThrow(changeStageSchema, rawInput);

  return guard("changeStage", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConOpportunity.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Opportunity not found");
      assertVersion(existing.version, input.expectedVersion);

      if (existing.stage === input.stage) return existing;

      const updated = await tx.govConOpportunity.update({
        where: { id: existing.id },
        data: {
          stage: input.stage,
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
          lastActivityAt: new Date(),
          ...(isClosedStage(input.stage) && input.stage === "ARCHIVED"
            ? { archivedAt: new Date() }
            : {}),
        },
      });
      await tx.govConOpportunityStageHistory.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          opportunityId: existing.id,
          fromStage: existing.stage,
          toStage: input.stage,
          changedBy: ctx.actorHubUserId,
          note: input.note ?? null,
        },
      });
      await recordAudit(tx, ctx, {
        action: "opportunity.stage_changed",
        entityType: "GovConOpportunity",
        entityId: existing.id,
        opportunityId: existing.id,
        summary: `Stage ${existing.stage} → ${input.stage}`,
        before: { stage: existing.stage },
        after: { stage: input.stage },
      });
      return updated;
    }),
  );
}

export async function archiveOpportunity(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ARCHIVE);
  return guard("archive", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConOpportunity.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Opportunity not found");
      const updated = await tx.govConOpportunity.update({
        where: { id: existing.id },
        data: {
          archivedAt: new Date(),
          stage: "ARCHIVED",
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
        },
      });
      await recordAudit(tx, ctx, {
        action: "opportunity.archived",
        entityType: "GovConOpportunity",
        entityId: existing.id,
        opportunityId: existing.id,
        summary: `Archived opportunity “${existing.internalName}”`,
        before: { stage: existing.stage, archivedAt: existing.archivedAt },
        after: { stage: "ARCHIVED", archivedAt: updated.archivedAt },
      });
      return updated;
    }),
  );
}

function assertVersion(current: number, expected: number | undefined): void {
  if (expected !== undefined && expected !== current) {
    throw new ConflictError("This opportunity was modified by someone else.", {
      context: { current, expected },
    });
  }
}

/** Strip undefined keys so update() only writes provided fields. */
function toWriteData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "expectedVersion" || k === "internalName") continue;
    if (v === undefined) continue;
    data[k] = v;
  }
  return data;
}

/** Compact snapshot of the mutable fields worth auditing (no huge text blobs). */
function auditSnapshot(o: GovConOpportunity): Record<string, unknown> {
  return {
    internalName: o.internalName,
    stage: o.stage,
    health: o.health,
    priority: o.priority,
    pWin: o.pWin,
    estimatedValue: toNumber(o.estimatedValue),
    captureOwnerId: o.captureOwnerId,
    proposalManagerId: o.proposalManagerId,
    teamRole: o.teamRole,
  };
}

// --- Dashboard aggregates ---------------------------------------------------

export interface DashboardData {
  kpis: {
    activePursuits: number;
    activeBids: number;
    openSbirTopics: number;
    qualifiedPipeline: number;
    weightedPipeline: number;
    winRate: number | null;
    upcomingDeadlines: number;
    atRiskPursuits: number;
    awaitingPartnerActions: number;
    proposalsInReview: number;
  };
  pipelineByStage: ReturnType<typeof rollupByStage>;
  pipelineByAgency: Array<{
    agencyId: string | null;
    agencyName: string;
    count: number;
    totalValue: number;
    weightedValue: number;
  }>;
}

export async function getDashboardData(ctx: GovConContext): Promise<DashboardData> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return guard("dashboard", async () => {
    const active = await prisma.govConOpportunity.findMany({
      where: { hubOrganizationId: ctx.tenantOrgId, archivedAt: null },
      select: {
        id: true,
        stage: true,
        health: true,
        estimatedValue: true,
        pWin: true,
        proposalDeadline: true,
        agencyId: true,
        agency: { select: { name: true } },
      },
    });

    const [awarded, lost, openSbirTopics, proposalsInReview, awaitingPartnerActions] =
      await Promise.all([
        prisma.govConOpportunity.count({
          where: { hubOrganizationId: ctx.tenantOrgId, stage: "AWARDED" },
        }),
        prisma.govConOpportunity.count({
          where: { hubOrganizationId: ctx.tenantOrgId, stage: "LOST" },
        }),
        prisma.govConSbirTopic.count({
          where: { hubOrganizationId: ctx.tenantOrgId, archivedAt: null, opportunityId: null },
        }),
        prisma.govConProposal.count({
          where: {
            hubOrganizationId: ctx.tenantOrgId,
            status: { in: ["INTERNAL_REVIEW", "IN_PROGRESS"] },
          },
        }),
        prisma.govConOpportunityPartner.count({
          where: {
            hubOrganizationId: ctx.tenantOrgId,
            OR: [
              { ndaStatus: { in: ["REQUESTED", "IN_NEGOTIATION"] } },
              { teamingStatus: { in: ["REQUESTED", "IN_NEGOTIATION"] } },
            ],
          },
        }),
      ]);

    const openOpps = active.filter((o) => QUALIFIED_STAGES.includes(o.stage));
    const qualifiedPipeline = openOpps.reduce((sum, o) => sum + toNumber(o.estimatedValue), 0);
    const weightedPipeline = active.reduce(
      (sum, o) => sum + weightedValue(o.estimatedValue, o.pWin),
      0,
    );
    const upcomingDeadlines = active.filter(
      (o) => o.proposalDeadline && o.proposalDeadline >= now && o.proposalDeadline <= in30,
    ).length;
    const atRiskPursuits = active.filter(
      (o) => o.health === "AT_RISK" || o.health === "CRITICAL",
    ).length;
    const activeBids = active.filter((o) =>
      ["PROPOSAL", "SUBMITTED", "EVALUATION"].includes(o.stage),
    ).length;

    // Pipeline by agency.
    const agencyMap = new Map<
      string,
      { agencyId: string | null; agencyName: string; count: number; totalValue: number; weightedValue: number }
    >();
    for (const o of active) {
      const key = o.agencyId ?? "unassigned";
      const row =
        agencyMap.get(key) ??
        {
          agencyId: o.agencyId,
          agencyName: o.agency?.name ?? "Unassigned",
          count: 0,
          totalValue: 0,
          weightedValue: 0,
        };
      row.count += 1;
      row.totalValue += toNumber(o.estimatedValue);
      row.weightedValue += weightedValue(o.estimatedValue, o.pWin);
      agencyMap.set(key, row);
    }

    return {
      kpis: {
        activePursuits: active.filter((o) => !isClosedStage(o.stage)).length,
        activeBids,
        openSbirTopics,
        qualifiedPipeline,
        weightedPipeline,
        winRate: winRate(awarded, lost),
        upcomingDeadlines,
        atRiskPursuits,
        awaitingPartnerActions,
        proposalsInReview,
      },
      pipelineByStage: rollupByStage(
        active.map((o) => ({ stage: o.stage, estimatedValue: o.estimatedValue, pWin: o.pWin })),
      ),
      pipelineByAgency: [...agencyMap.values()].sort((a, b) => b.weightedValue - a.weightedValue),
    };
  });
}

export type { GovConStage };
