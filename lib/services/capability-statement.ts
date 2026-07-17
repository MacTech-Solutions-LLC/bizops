/**
 * Capability-statement service.
 *
 * The Capability Statement is the customer-facing document the member profile
 * feeds. This service owns three things and nothing more:
 *
 *  - `getCapabilityStatement` — the stored narrative plus the *live* hard-facts
 *    block (company identity, NAICS, clearance, certifications, past performance)
 *    assembled fresh from confirmed sources every read.
 *  - `generateCapabilityStatement` — pull local profile + company + the member's
 *    own Hub profile (the "fetched from other apps in the suite" round-trip), and
 *    draft the narrative with AI. Returns the draft for review; PERSISTS NOTHING.
 *    A model-written statement never reaches the database unconfirmed.
 *  - `saveCapabilityStatement` — persist exactly what the member confirmed.
 *
 * Permission model matches `member-profile`: acting on your own statement needs
 * only self-manage; anyone else's needs the manage grant. `requireStatementAccess`
 * is the single gate on every path that takes a `hubUserId`.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import { saveCapabilityStatementSchema } from "@/lib/validation/capability-statement";
import { fetchProfileFromHub } from "@/lib/hub/profile";
import {
  assembleDraftInput,
  assembleFacts,
  seedDraft,
  type CapabilityDraft,
  type StatementFacts,
} from "@/lib/capability-statement/assemble";
import { draftWithAI, CAPABILITY_STATEMENT_MODEL } from "@/lib/capability-statement/ai";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("capability_statement_service_failed", err, { op });
    throw new OperationalError("Capability statement operation failed", { cause: err });
  }
}

const profileInclude = {
  skills: { orderBy: { name: "asc" } },
  certifications: { orderBy: { name: "asc" } },
  experience: { orderBy: { startedOn: "desc" } },
} satisfies Prisma.GovConMemberProfileInclude;

function requireStatementAccess(ctx: GovConContext, hubUserId: string): void {
  if (hubUserId === ctx.actorHubUserId) {
    requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_SELF_MANAGE);
    return;
  }
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE);
}

/** The stored narrative, serialised for the client (dates as ISO strings). */
export interface StoredStatementView {
  professionalSummary: string | null;
  coreCompetencies: string[];
  differentiators: string[];
  pastPerformanceHighlights: string[];
  generateModel: string | null;
  generatedAt: string | null;
  hubSyncedAt: string | null;
  confirmedAt: string | null;
  updatedAt: string;
}

export interface CapabilityStatementView {
  /** Null until the member has generated and saved one. */
  statement: StoredStatementView | null;
  /** The live hard-facts block — always available from the profile. */
  facts: StatementFacts;
}

export interface StatementDraftResult {
  draft: CapabilityDraft;
  facts: StatementFacts;
  meta: {
    /** Model that drafted it, or null when the deterministic seed was used. */
    model: string | null;
    /** Whether the Hub round-trip fed the draft. */
    fromSuite: boolean;
    aiStatus: "ok" | "failed";
    /** Present when aiStatus is "failed": why, in member-facing words. */
    aiMessage: string | null;
  };
}

async function loadProfile(ctx: GovConContext, hubUserId: string) {
  return prisma.govConMemberProfile.findUnique({
    where: { hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId } },
    include: profileInclude,
  });
}

function loadCompany(ctx: GovConContext) {
  return prisma.companyProfile.findUnique({
    where: { hubOrganizationId: ctx.tenantOrgId },
  });
}

/** Read the stored statement (if any) plus the live facts block. */
export async function getCapabilityStatement(
  ctx: GovConContext,
  hubUserId: string = ctx.actorHubUserId,
): Promise<CapabilityStatementView> {
  requireStatementAccess(ctx, hubUserId);

  return guard("getCapabilityStatement", async () => {
    const [profile, company] = await Promise.all([loadProfile(ctx, hubUserId), loadCompany(ctx)]);
    if (!profile) throw new NotFoundError("Profile not found");

    const stored = await prisma.govConCapabilityStatement.findUnique({
      where: { profileId: profile.id },
    });

    return {
      statement: stored
        ? {
            professionalSummary: stored.professionalSummary,
            coreCompetencies: stored.coreCompetencies,
            differentiators: stored.differentiators,
            pastPerformanceHighlights: stored.pastPerformanceHighlights,
            generateModel: stored.generateModel,
            generatedAt: stored.generatedAt?.toISOString() ?? null,
            hubSyncedAt: stored.hubSyncedAt?.toISOString() ?? null,
            confirmedAt: stored.confirmedAt?.toISOString() ?? null,
            updatedAt: stored.updatedAt.toISOString(),
          }
        : null,
      facts: assembleFacts(profile, company),
    };
  });
}

/**
 * Draft a statement from the profile, the company identity, and the member's
 * own Hub capability profile. Returns the draft for review — never writes.
 *
 * AI failure is not member failure: if the model is unconfigured or errors, this
 * falls back to a deterministic seed built from the same confirmed facts, so the
 * member can always develop the statement by hand. The Hub round-trip is
 * best-effort and simply absent in mock/dev.
 */
export async function generateCapabilityStatement(
  ctx: GovConContext,
  hubUserId: string = ctx.actorHubUserId,
): Promise<StatementDraftResult> {
  requireStatementAccess(ctx, hubUserId);

  return guard("generateCapabilityStatement", async () => {
    const [profile, company] = await Promise.all([loadProfile(ctx, hubUserId), loadCompany(ctx)]);
    if (!profile) throw new NotFoundError("Profile not found");

    // Best-effort: null in mock mode, on a Hub outage, or before the read key is
    // issued. The draft is fully buildable from local data without it.
    const hub = await fetchProfileFromHub(hubUserId);
    const facts = assembleFacts(profile, company);
    const input = assembleDraftInput(profile, company, hub);

    try {
      const draft = await draftWithAI(input);
      return {
        draft,
        facts,
        meta: {
          model: CAPABILITY_STATEMENT_MODEL,
          fromSuite: input.fromSuite,
          aiStatus: "ok",
          aiMessage: null,
        },
      };
    } catch (err) {
      // Degrade to the seed rather than fail the member. userMessage explains
      // why automatic drafting didn't run; the seed still gives them something
      // to edit.
      const aiMessage = isAppError(err)
        ? err.userMessage
        : "Automatic drafting was unavailable, so we seeded the statement from your confirmed profile.";
      logger.warn("capability_statement_draft_degraded", {
        actorHubUserId: ctx.actorHubUserId,
        reason: aiMessage,
      });
      return {
        draft: seedDraft(profile),
        facts,
        meta: { model: null, fromSuite: input.fromSuite, aiStatus: "failed", aiMessage },
      };
    }
  });
}

/**
 * Persist the statement the member confirmed. Upserts the single row per
 * profile; records `capability_statement.saved`. Only the narrative and its
 * provenance are written — the hard facts are never stored here.
 */
export async function saveCapabilityStatement(
  ctx: GovConContext,
  hubUserId: string,
  rawInput: unknown,
): Promise<CapabilityStatementView> {
  requireStatementAccess(ctx, hubUserId);
  const input = parseOrThrow(saveCapabilityStatementSchema, rawInput);

  return guard("saveCapabilityStatement", async () => {
    const [profile, company] = await Promise.all([loadProfile(ctx, hubUserId), loadCompany(ctx)]);
    if (!profile) throw new NotFoundError("Profile not found");

    const now = new Date();
    // generatedAt reflects an AI draft; only stamp it when a model actually
    // produced this one, so a hand-written statement doesn't claim a draft it
    // never had.
    const generatedAt = input.generateModel ? now : null;
    const hubSyncedAt = input.syncedFromSuite ? now : null;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.govConCapabilityStatement.findUnique({
        where: { profileId: profile.id },
        select: { id: true },
      });

      const saved = await tx.govConCapabilityStatement.upsert({
        where: { profileId: profile.id },
        create: {
          hubOrganizationId: ctx.tenantOrgId,
          hubUserId,
          profileId: profile.id,
          professionalSummary: input.professionalSummary,
          coreCompetencies: input.coreCompetencies,
          differentiators: input.differentiators,
          pastPerformanceHighlights: input.pastPerformanceHighlights,
          generateModel: input.generateModel,
          generatedAt,
          hubSyncedAt,
          confirmedAt: now,
        },
        update: {
          professionalSummary: input.professionalSummary,
          coreCompetencies: input.coreCompetencies,
          differentiators: input.differentiators,
          pastPerformanceHighlights: input.pastPerformanceHighlights,
          generateModel: input.generateModel,
          // On update, only advance generatedAt when this save carried a fresh
          // AI draft; a hand-edit leaves the prior provenance intact.
          ...(input.generateModel ? { generatedAt } : {}),
          hubSyncedAt,
          confirmedAt: now,
        },
      });

      await recordAudit(tx, ctx, {
        action: "capability_statement.saved",
        eventCategory: "org",
        entityType: "GovConCapabilityStatement",
        entityId: saved.id,
        summary: `Capability statement ${existing ? "updated" : "created"} for ${hubUserId}`,
        after: {
          created: !existing,
          generateModel: input.generateModel,
          fromSuite: input.syncedFromSuite,
          competencies: input.coreCompetencies.length,
          differentiators: input.differentiators.length,
          pastPerformance: input.pastPerformanceHighlights.length,
        },
      });
    });

    return {
      statement: {
        professionalSummary: input.professionalSummary,
        coreCompetencies: input.coreCompetencies,
        differentiators: input.differentiators,
        pastPerformanceHighlights: input.pastPerformanceHighlights,
        generateModel: input.generateModel,
        generatedAt: generatedAt?.toISOString() ?? null,
        hubSyncedAt: hubSyncedAt?.toISOString() ?? null,
        confirmedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      facts: assembleFacts(profile, company),
    };
  });
}
