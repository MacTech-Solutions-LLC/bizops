/**
 * Company-wide capability-statement service.
 *
 * The org-level sibling of `lib/services/capability-statement.ts`, same three
 * responsibilities:
 *
 *  - `getCompanyStatement` — the stored narrative plus the *live* aggregated
 *    facts block, assembled fresh from published member profiles every read.
 *    GOVCON_VIEW: the whole team can see the shared document.
 *  - `generateCompanyStatement` — pull every published profile + confirmed
 *    member statement and draft the org narrative with AI. Returns the draft
 *    for review; PERSISTS NOTHING. GOVCON_PROFILE_MANAGE: managers drive the
 *    org-wide document.
 *  - `saveCompanyStatement` — persist exactly what the manager confirmed, and
 *    stamp which members' published content fed it (`sourceHubUserIds`).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { OperationalError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import { saveCompanyStatementSchema } from "@/lib/validation/company-statement";
import type { CapabilityDraft } from "@/lib/capability-statement/assemble";
import {
  assembleCompanyDraftInput,
  assembleCompanyFacts,
  seedCompanyDraft,
  type CompanyStatementFacts,
  type MemberContribution,
} from "@/lib/company-statement/assemble";
import {
  COMPANY_STATEMENT_MODEL,
  draftCompanyStatementWithAI,
} from "@/lib/company-statement/ai";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("company_statement_service_failed", err, { op });
    throw new OperationalError("Company statement operation failed", { cause: err });
  }
}

const contributionInclude = {
  skills: { orderBy: { name: "asc" } },
  certifications: { orderBy: { name: "asc" } },
  experience: { orderBy: { startedOn: "desc" } },
  capabilityStatement: true,
} satisfies Prisma.GovConMemberProfileInclude;

function year(value: Date | null): string | null {
  return value ? String(value.getUTCFullYear()) : null;
}

function period(startedOn: Date | null, endedOn: Date | null): string {
  const start = year(startedOn);
  const end = year(endedOn);
  if (!start && !end) return "";
  return `${start ?? "?"}–${end ?? "Present"}`;
}

/** Published profiles projected to the ingestion unit. Only published rows and
 * only confirmed statements — a draft must never reach the org document. */
async function loadContributions(ctx: GovConContext): Promise<MemberContribution[]> {
  const profiles = await prisma.govConMemberProfile.findMany({
    where: { hubOrganizationId: ctx.tenantOrgId, status: "published" },
    include: contributionInclude,
    orderBy: { updatedAt: "desc" },
  });

  return profiles.map((p) => ({
    hubUserId: p.hubUserId,
    headline: p.headline,
    laborCategory: p.laborCategory,
    yearsExperience: p.yearsExperience,
    clearanceLevel: p.clearanceLevel,
    naicsCodes: p.naicsCodes,
    skills: p.skills.map((s) => s.name),
    certifications: p.certifications.map((c) => ({ name: c.name, issuer: c.issuer })),
    federalPastPerformance: p.experience
      .filter((e) => e.isFederal)
      .map((e) => ({
        organization: e.organization,
        role: e.role,
        agency: e.agency,
        contractName: e.contractName,
        period: period(e.startedOn, e.endedOn),
        summary: e.summary,
      })),
    statement:
      p.capabilityStatement && p.capabilityStatement.confirmedAt
        ? {
            professionalSummary: p.capabilityStatement.professionalSummary,
            coreCompetencies: p.capabilityStatement.coreCompetencies,
            differentiators: p.capabilityStatement.differentiators,
            pastPerformanceHighlights: p.capabilityStatement.pastPerformanceHighlights,
          }
        : null,
  }));
}

function loadCompany(ctx: GovConContext) {
  return prisma.companyProfile.findUnique({
    where: { hubOrganizationId: ctx.tenantOrgId },
  });
}

/** The stored narrative, serialised for the client (dates as ISO strings). */
export interface StoredCompanyStatementView {
  professionalSummary: string | null;
  coreCompetencies: string[];
  differentiators: string[];
  pastPerformanceHighlights: string[];
  generateModel: string | null;
  generatedAt: string | null;
  confirmedAt: string | null;
  confirmedByHubUserId: string | null;
  sourceHubUserIds: string[];
  updatedAt: string;
}

export interface CompanyStatementView {
  /** Null until a manager has generated and saved one. */
  statement: StoredCompanyStatementView | null;
  /** Live aggregates from published profiles — always available. */
  facts: CompanyStatementFacts;
}

export interface CompanyStatementDraftResult {
  draft: CapabilityDraft;
  facts: CompanyStatementFacts;
  meta: {
    /** Model that drafted it, or null when the deterministic seed was used. */
    model: string | null;
    /** How many published members fed this draft. */
    contributorCount: number;
    aiStatus: "ok" | "failed";
    aiMessage: string | null;
  };
}

function toView(
  stored: Prisma.GovConCompanyCapabilityStatementGetPayload<object> | null,
): StoredCompanyStatementView | null {
  if (!stored) return null;
  return {
    professionalSummary: stored.professionalSummary,
    coreCompetencies: stored.coreCompetencies,
    differentiators: stored.differentiators,
    pastPerformanceHighlights: stored.pastPerformanceHighlights,
    generateModel: stored.generateModel,
    generatedAt: stored.generatedAt?.toISOString() ?? null,
    confirmedAt: stored.confirmedAt?.toISOString() ?? null,
    confirmedByHubUserId: stored.confirmedByHubUserId,
    sourceHubUserIds: stored.sourceHubUserIds,
    updatedAt: stored.updatedAt.toISOString(),
  };
}

/** Read the stored statement (if any) plus the live aggregated facts. */
export async function getCompanyStatement(ctx: GovConContext): Promise<CompanyStatementView> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);

  return guard("getCompanyStatement", async () => {
    const [stored, company, contributions] = await Promise.all([
      prisma.govConCompanyCapabilityStatement.findUnique({
        where: { hubOrganizationId: ctx.tenantOrgId },
      }),
      loadCompany(ctx),
      loadContributions(ctx),
    ]);

    return { statement: toView(stored), facts: assembleCompanyFacts(company, contributions) };
  });
}

/**
 * Draft the org-wide statement from every published profile and confirmed
 * member statement. Returns the draft for manager review — never writes.
 * AI failure degrades to the deterministic seed, like the member flow.
 */
export async function generateCompanyStatement(
  ctx: GovConContext,
): Promise<CompanyStatementDraftResult> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE);

  return guard("generateCompanyStatement", async () => {
    const [company, contributions] = await Promise.all([loadCompany(ctx), loadContributions(ctx)]);

    if (contributions.length === 0) {
      throw new OperationalError("No published profiles to draft from", {
        userMessage:
          "No one has published a profile yet, so there is nothing to build the company statement from. Ask members to complete and publish their profiles first.",
      });
    }

    const facts = assembleCompanyFacts(company, contributions);
    const input = assembleCompanyDraftInput(company, contributions);

    try {
      const draft = await draftCompanyStatementWithAI(input);
      return {
        draft,
        facts,
        meta: {
          model: COMPANY_STATEMENT_MODEL,
          contributorCount: contributions.length,
          aiStatus: "ok",
          aiMessage: null,
        },
      };
    } catch (err) {
      const aiMessage = isAppError(err)
        ? err.userMessage
        : "Automatic drafting was unavailable, so we seeded the statement from the team's confirmed content.";
      logger.warn("company_statement_draft_degraded", {
        actorHubUserId: ctx.actorHubUserId,
        reason: aiMessage,
      });
      return {
        draft: seedCompanyDraft(contributions),
        facts,
        meta: {
          model: null,
          contributorCount: contributions.length,
          aiStatus: "failed",
          aiMessage,
        },
      };
    }
  });
}

/**
 * Persist the statement the manager confirmed. Upserts the single org row and
 * stamps `sourceHubUserIds` server-side from the members whose published
 * content is feeding the document at save time — provenance is derived, never
 * client-asserted.
 */
export async function saveCompanyStatement(
  ctx: GovConContext,
  rawInput: unknown,
): Promise<CompanyStatementView> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE);
  const input = parseOrThrow(saveCompanyStatementSchema, rawInput);

  return guard("saveCompanyStatement", async () => {
    const [company, contributions] = await Promise.all([loadCompany(ctx), loadContributions(ctx)]);

    const now = new Date();
    const generatedAt = input.generateModel ? now : null;
    const sourceHubUserIds = contributions.map((c) => c.hubUserId);

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.govConCompanyCapabilityStatement.findUnique({
        where: { hubOrganizationId: ctx.tenantOrgId },
        select: { id: true },
      });

      const row = await tx.govConCompanyCapabilityStatement.upsert({
        where: { hubOrganizationId: ctx.tenantOrgId },
        create: {
          hubOrganizationId: ctx.tenantOrgId,
          professionalSummary: input.professionalSummary,
          coreCompetencies: input.coreCompetencies,
          differentiators: input.differentiators,
          pastPerformanceHighlights: input.pastPerformanceHighlights,
          generateModel: input.generateModel,
          generatedAt,
          sourceHubUserIds,
          confirmedAt: now,
          confirmedByHubUserId: ctx.actorHubUserId,
        },
        update: {
          professionalSummary: input.professionalSummary,
          coreCompetencies: input.coreCompetencies,
          differentiators: input.differentiators,
          pastPerformanceHighlights: input.pastPerformanceHighlights,
          generateModel: input.generateModel,
          // Only advance generatedAt when this save carried a fresh AI draft.
          ...(input.generateModel ? { generatedAt } : {}),
          sourceHubUserIds,
          confirmedAt: now,
          confirmedByHubUserId: ctx.actorHubUserId,
        },
      });

      await recordAudit(tx, ctx, {
        action: "company_statement.saved",
        eventCategory: "org",
        entityType: "GovConCompanyCapabilityStatement",
        entityId: row.id,
        summary: `Company capability statement ${existing ? "updated" : "created"}`,
        after: {
          created: !existing,
          generateModel: input.generateModel,
          contributors: sourceHubUserIds.length,
          competencies: input.coreCompetencies.length,
          differentiators: input.differentiators.length,
          pastPerformance: input.pastPerformanceHighlights.length,
        },
      });

      return row;
    });

    return {
      statement: toView(saved),
      facts: assembleCompanyFacts(company, contributions),
    };
  });
}
