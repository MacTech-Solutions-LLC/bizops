/**
 * Team service — the org roster and per-member views behind /team.
 *
 * Follows the GovCon service contract: context + permission gate + tenant
 * filter. Reads only — the Team section renders what other flows confirmed.
 *
 * Permission model, deliberately distinct from `member-profile`:
 *  - The roster and *published* profiles are visible to anyone who can see the
 *    workspace (GOVCON_VIEW). Publishing is the member's explicit "this is
 *    what colleagues and documents may use" step, so published content is
 *    org-visible by design.
 *  - Draft content stays behind the existing gates: only the member themself
 *    or a GOVCON_PROFILE_MANAGE holder sees an unpublished profile's content.
 *    The roster still *lists* draft-profile members (with alert badges) — who
 *    is on the team is not a secret; what they haven't published yet is.
 *
 * Identity (names, emails, avatars) is read live from the Hub roster per
 * request and never persisted — bizops keeps holding zero identity rows.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireGovConPermission, hasGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fetchOrgRoster, rosterDisplayName } from "@/lib/hub/roster";
import {
  computeCoverage,
  mergeRoster,
  type TeamCoverage,
  type TeamRosterEntry,
} from "@/lib/domain/team";
import { assembleFacts, type StatementFacts } from "@/lib/capability-statement/assemble";
import type { StoredStatementView } from "@/lib/services/capability-statement";
import type { MemberProfile } from "@/lib/services/member-profile";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("team_service_failed", err, { op });
    throw new OperationalError("Team operation failed", { cause: err });
  }
}

const profileInclude = {
  skills: { orderBy: { name: "asc" } },
  certifications: { orderBy: { name: "asc" } },
  education: { orderBy: { completedOn: "desc" } },
  experience: { orderBy: { startedOn: "desc" } },
} satisfies Prisma.GovConMemberProfileInclude;

export interface TeamRosterView {
  entries: TeamRosterEntry[];
  coverage: TeamCoverage;
  /** False when the Hub roster was unavailable (mock mode or outage) and the
   * list is built from local capability rows only — i.e. members who have
   * never opened bizops may be missing. The page says so rather than letting
   * an incomplete list read as complete. */
  fromHub: boolean;
}

/**
 * The org roster with contribution alerts. GOVCON_VIEW — every workspace
 * member sees who is on the team and who still owes a resume or statement.
 */
export async function listTeamRoster(ctx: GovConContext): Promise<TeamRosterView> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);

  return guard("listTeamRoster", async () => {
    const [hubRoster, profiles, statements, directory] = await Promise.all([
      fetchOrgRoster(ctx.tenantOrgId),
      prisma.govConMemberProfile.findMany({
        where: { hubOrganizationId: ctx.tenantOrgId },
        select: {
          hubUserId: true,
          status: true,
          completeness: true,
          headline: true,
          laborCategory: true,
          resumeParsedAt: true,
          updatedAt: true,
        },
      }),
      prisma.govConCapabilityStatement.findMany({
        where: { hubOrganizationId: ctx.tenantOrgId },
        select: { hubUserId: true, confirmedAt: true },
      }),
      prisma.directoryContact.findMany({
        where: {
          hubOrganizationId: ctx.tenantOrgId,
          kind: "INTERNAL",
          hubUserId: { not: null },
          status: "ACTIVE",
        },
        select: { hubUserId: true, name: true, email: true },
      }),
    ]);

    const confirmedByUser = new Map(statements.map((s) => [s.hubUserId, s.confirmedAt]));
    const entries = mergeRoster(
      hubRoster,
      profiles.map((p) => ({
        hubUserId: p.hubUserId,
        profileStatus: p.status,
        completeness: p.completeness,
        headline: p.headline,
        laborCategory: p.laborCategory,
        resumeParsedAt: p.resumeParsedAt,
        statementConfirmedAt: confirmedByUser.get(p.hubUserId) ?? null,
        profileUpdatedAt: p.updatedAt,
      })),
      directory.map((d) => ({
        hubUserId: d.hubUserId as string,
        name: d.name,
        email: d.email,
      })),
    );

    return { entries, coverage: computeCoverage(entries), fromHub: hubRoster !== null };
  });
}

export interface TeamMemberView {
  hubUserId: string;
  displayName: string | null;
  email: string | null;
  imageUrl: string | null;
  /** Null when the member has never opened their bizops profile. */
  profileStatus: MemberProfile["status"] | null;
  hasResume: boolean;
  hasStatement: boolean;
  /** The full profile — present only when published, or when the viewer is the
   * member themself or holds the profile-manage grant. */
  profile: MemberProfile | null;
  /** Their confirmed capability statement + live facts, under the same rule. */
  statement: StoredStatementView | null;
  facts: StatementFacts | null;
}

/**
 * One member's Team page. GOVCON_VIEW to look; published content only, unless
 * the viewer is the member or a profile manager.
 */
export async function getTeamMemberView(
  ctx: GovConContext,
  hubUserId: string,
): Promise<TeamMemberView> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);

  return guard("getTeamMemberView", async () => {
    const [hubRoster, profile, company] = await Promise.all([
      fetchOrgRoster(ctx.tenantOrgId),
      prisma.govConMemberProfile.findUnique({
        where: {
          hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
        },
        include: { ...profileInclude, capabilityStatement: true },
      }),
      prisma.companyProfile.findUnique({ where: { hubOrganizationId: ctx.tenantOrgId } }),
    ]);

    const hub = hubRoster?.find((m) => m.hubUserId === hubUserId) ?? null;
    // Directory fallback so the header has a name in mock/degraded mode too.
    const dir = hub
      ? null
      : await prisma.directoryContact.findFirst({
          where: {
            hubOrganizationId: ctx.tenantOrgId,
            kind: "INTERNAL",
            hubUserId,
            status: "ACTIVE",
          },
          select: { name: true, email: true },
        });

    if (!hub && !profile && !dir) throw new NotFoundError("Team member not found");

    const canSeeUnpublished =
      hubUserId === ctx.actorHubUserId ||
      hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE);
    const contentVisible = Boolean(
      profile && (profile.status === "published" || canSeeUnpublished),
    );

    const stored = contentVisible ? profile?.capabilityStatement ?? null : null;

    return {
      hubUserId,
      displayName: (hub ? rosterDisplayName(hub) : null) ?? dir?.name ?? null,
      email: hub?.email ?? dir?.email ?? null,
      imageUrl: hub?.imageUrl ?? null,
      profileStatus: profile?.status ?? null,
      hasResume: Boolean(profile?.resumeParsedAt),
      hasStatement: Boolean(profile?.capabilityStatement?.confirmedAt),
      profile: contentVisible && profile ? profile : null,
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
      facts: contentVisible && profile ? assembleFacts(profile, company) : null,
    };
  });
}
