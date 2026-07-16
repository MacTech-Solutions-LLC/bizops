/**
 * Member capability profile service.
 *
 * Follows the GovCon service contract: context + permission gate + tenant
 * filter + audited transactional mutations.
 *
 * Two permission levels, deliberately distinct:
 *  - Acting on your OWN profile needs only GOVCON_PROFILE_SELF_MANAGE, which
 *    every role holds. Onboarding must not require an elevated grant.
 *  - Reading or editing SOMEONE ELSE's needs GOVCON_PROFILE_MANAGE. A member
 *    cannot read a colleague's clearance or past performance by guessing a
 *    hubUserId — `requireProfileAccess` is the gate, and it is applied on
 *    every path that takes a `hubUserId` argument.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  scoreCompleteness,
  type CompletenessResult,
} from "@/lib/domain/profile-completeness";
import {
  applyResumeProposalSchema,
  saveMemberProfileSchema,
  updateMemberProfileSchema,
} from "@/lib/validation/member-profile";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("member_profile_service_failed", err, { op });
    throw new OperationalError("Profile operation failed", { cause: err });
  }
}

const profileInclude = {
  skills: { orderBy: { name: "asc" } },
  certifications: { orderBy: { name: "asc" } },
  education: { orderBy: { completedOn: "desc" } },
  experience: { orderBy: { startedOn: "desc" } },
} satisfies Prisma.GovConMemberProfileInclude;

export type MemberProfile = Prisma.GovConMemberProfileGetPayload<{
  include: typeof profileInclude;
}>;

export interface MemberProfileWithCompleteness {
  profile: MemberProfile;
  completeness: CompletenessResult;
}

/**
 * The access gate. Reading/writing your own profile is always allowed; anyone
 * else's requires the manage grant.
 */
function requireProfileAccess(ctx: GovConContext, hubUserId: string): void {
  if (hubUserId === ctx.actorHubUserId) {
    requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_SELF_MANAGE);
    return;
  }
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE);
}

function completenessFor(profile: MemberProfile): CompletenessResult {
  return scoreCompleteness({
    headline: profile.headline,
    summary: profile.summary,
    laborCategory: profile.laborCategory,
    yearsExperience: profile.yearsExperience,
    clearanceLevel: profile.clearanceLevel,
    skillCount: profile.skills.length,
    certificationCount: profile.certifications.length,
    educationCount: profile.education.length,
    experienceCount: profile.experience.length,
    federalExperienceCount: profile.experience.filter((e) => e.isFederal).length,
  });
}

/**
 * Fetch a profile, creating an empty draft on first access. Onboarding needs a
 * row to attach to, and an empty draft carries no claims, so creating one
 * lazily is safe and avoids a separate "start onboarding" mutation.
 */
export async function getOrCreateProfile(
  ctx: GovConContext,
  hubUserId: string = ctx.actorHubUserId,
): Promise<MemberProfileWithCompleteness> {
  requireProfileAccess(ctx, hubUserId);

  return guard("getOrCreateProfile", async () => {
    const existing = await prisma.govConMemberProfile.findUnique({
      where: {
        hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
      },
      include: profileInclude,
    });
    if (existing) return { profile: existing, completeness: completenessFor(existing) };

    const created = await prisma.govConMemberProfile.create({
      data: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
      include: profileInclude,
    });
    return { profile: created, completeness: completenessFor(created) };
  });
}

/** Fetch without creating. Returns null when the member hasn't started. */
export async function findProfile(
  ctx: GovConContext,
  hubUserId: string,
): Promise<MemberProfileWithCompleteness | null> {
  requireProfileAccess(ctx, hubUserId);

  return guard("findProfile", async () => {
    const profile = await prisma.govConMemberProfile.findUnique({
      where: {
        hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
      },
      include: profileInclude,
    });
    return profile ? { profile, completeness: completenessFor(profile) } : null;
  });
}

/** Update scalar fields on a profile (the manual-edit path). */
export async function updateProfile(
  ctx: GovConContext,
  hubUserId: string,
  rawInput: unknown,
): Promise<MemberProfileWithCompleteness> {
  requireProfileAccess(ctx, hubUserId);
  const input = parseOrThrow(updateMemberProfileSchema, rawInput);

  return guard("updateProfile", async () => {
    const before = await prisma.govConMemberProfile.findUnique({
      where: {
        hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
      },
      include: profileInclude,
    });
    if (!before) throw new NotFoundError("Profile not found");

    // Strip undefined so an omitted field is left untouched rather than nulled.
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) data[k] = v;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.govConMemberProfile.update({
        where: { id: before.id },
        data,
        include: profileInclude,
      });
      const rescored = await tx.govConMemberProfile.update({
        where: { id: next.id },
        data: { completeness: completenessFor(next).score },
        include: profileInclude,
      });
      await recordAudit(tx, ctx, {
        action: "member_profile.updated",
        eventCategory: "org",
        entityType: "GovConMemberProfile",
        entityId: rescored.id,
        summary: `Profile updated for ${hubUserId}`,
        before: { completeness: before.completeness },
        after: { completeness: rescored.completeness },
      });
      return rescored;
    });

    return { profile: updated, completeness: completenessFor(updated) };
  });
}

/**
 * Drop every section row on a profile, so the caller can recreate them from the
 * payload. Shared by the two full-profile save paths, which both submit the
 * member's complete reviewed set: a row they removed is absent from the payload
 * and must therefore disappear from the profile rather than linger.
 */
async function clearSections(tx: Prisma.TransactionClient, profileId: string): Promise<void> {
  await tx.govConMemberSkill.deleteMany({ where: { profileId } });
  await tx.govConMemberCertification.deleteMany({ where: { profileId } });
  await tx.govConMemberEducation.deleteMany({ where: { profileId } });
  await tx.govConMemberExperience.deleteMany({ where: { profileId } });
}

/**
 * Save a manually edited profile — scalars and all four sections.
 *
 * Distinct from `applyResumeProposal` in exactly the ways that matter for the
 * audit trail: it does not touch `resumeParsedAt`/`resumeSourceFilename`, and it
 * records `member_profile.updated`. A member who hand-types their profile has
 * not parsed a resume, and the record should not say they did.
 */
export async function saveProfile(
  ctx: GovConContext,
  hubUserId: string,
  rawInput: unknown,
): Promise<MemberProfileWithCompleteness> {
  requireProfileAccess(ctx, hubUserId);
  const input = parseOrThrow(saveMemberProfileSchema, rawInput);

  return guard("saveProfile", async () => {
    const existing = await prisma.govConMemberProfile.findUnique({
      where: {
        hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
      },
      include: profileInclude,
    });
    if (!existing) throw new NotFoundError("Profile not found");

    const updated = await prisma.$transaction(async (tx) => {
      await clearSections(tx, existing.id);

      const withChildren = await tx.govConMemberProfile.update({
        where: { id: existing.id },
        data: {
          headline: input.headline,
          summary: input.summary,
          laborCategory: input.laborCategory,
          yearsExperience: input.yearsExperience,
          clearanceLevel: input.clearanceLevel,
          naicsCodes: input.naicsCodes,
          skills: { create: input.skills },
          certifications: { create: input.certifications },
          education: { create: input.education },
          experience: { create: input.experience },
        },
        include: profileInclude,
      });

      const rescored = await tx.govConMemberProfile.update({
        where: { id: withChildren.id },
        data: { completeness: completenessFor(withChildren).score },
        include: profileInclude,
      });

      await recordAudit(tx, ctx, {
        action: "member_profile.updated",
        eventCategory: "org",
        entityType: "GovConMemberProfile",
        entityId: rescored.id,
        summary: `Profile edited for ${hubUserId}`,
        before: { completeness: existing.completeness },
        after: { completeness: rescored.completeness },
      });
      return rescored;
    });

    return { profile: updated, completeness: completenessFor(updated) };
  });
}

/**
 * Apply a reviewed resume proposal.
 *
 * This is the ONLY path by which parsed resume data is persisted, and it runs
 * only on data the member has seen and confirmed. Collections are replaced
 * wholesale with what the member submitted: rows they removed in the review UI
 * are absent from the payload and therefore deleted, which is what makes
 * rejecting a bad extraction actually stick.
 *
 * The resume binary is not a parameter here and never reaches this layer —
 * `resumeSourceFilename` is provenance metadata, not a storage pointer.
 */
export async function applyResumeProposal(
  ctx: GovConContext,
  hubUserId: string,
  rawInput: unknown,
): Promise<MemberProfileWithCompleteness> {
  requireProfileAccess(ctx, hubUserId);
  const input = parseOrThrow(applyResumeProposalSchema, rawInput);

  return guard("applyResumeProposal", async () => {
    const existing = await prisma.govConMemberProfile.findUnique({
      where: {
        hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
      },
    });
    if (!existing) throw new NotFoundError("Profile not found");

    const updated = await prisma.$transaction(async (tx) => {
      await clearSections(tx, existing.id);

      const withChildren = await tx.govConMemberProfile.update({
        where: { id: existing.id },
        data: {
          headline: input.headline,
          summary: input.summary,
          laborCategory: input.laborCategory,
          yearsExperience: input.yearsExperience,
          clearanceLevel: input.clearanceLevel,
          naicsCodes: input.naicsCodes,
          resumeParsedAt: new Date(),
          resumeSourceFilename: input.resumeSourceFilename ?? null,
          resumeParseModel: input.resumeParseModel ?? null,
          skills: { create: input.skills },
          certifications: { create: input.certifications },
          education: { create: input.education },
          experience: { create: input.experience },
        },
        include: profileInclude,
      });

      const rescored = await tx.govConMemberProfile.update({
        where: { id: withChildren.id },
        data: { completeness: completenessFor(withChildren).score },
        include: profileInclude,
      });

      await recordAudit(tx, ctx, {
        action: "member_profile.resume_applied",
        eventCategory: "org",
        entityType: "GovConMemberProfile",
        entityId: rescored.id,
        summary: `Resume-derived profile confirmed for ${hubUserId}`,
        after: {
          // Provenance for the audit trail: which model produced the extraction
          // and how much of it the member kept. The resume text itself is
          // deliberately NOT recorded — it is not stored anywhere.
          sourceFilename: input.resumeSourceFilename ?? null,
          parseModel: input.resumeParseModel ?? null,
          skills: input.skills.length,
          certifications: input.certifications.length,
          experience: input.experience.length,
          completeness: rescored.completeness,
        },
      });
      return rescored;
    });

    return { profile: updated, completeness: completenessFor(updated) };
  });
}

/** Mark a profile published — the point at which it becomes eligible for
 * capability statements and org-wide rollups. */
export async function publishProfile(
  ctx: GovConContext,
  hubUserId: string = ctx.actorHubUserId,
): Promise<MemberProfileWithCompleteness> {
  requireProfileAccess(ctx, hubUserId);

  return guard("publishProfile", async () => {
    const existing = await prisma.govConMemberProfile.findUnique({
      where: {
        hubOrganizationId_hubUserId: { hubOrganizationId: ctx.tenantOrgId, hubUserId },
      },
      include: profileInclude,
    });
    if (!existing) throw new NotFoundError("Profile not found");

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.govConMemberProfile.update({
        where: { id: existing.id },
        data: { status: "published", completeness: completenessFor(existing).score },
        include: profileInclude,
      });
      await recordAudit(tx, ctx, {
        action: "member_profile.published",
        eventCategory: "org",
        entityType: "GovConMemberProfile",
        entityId: next.id,
        summary: `Profile published for ${hubUserId}`,
        before: { status: existing.status },
        after: { status: next.status, completeness: next.completeness },
      });
      return next;
    });

    return { profile: updated, completeness: completenessFor(updated) };
  });
}

/**
 * List published profiles for the org. Feeds manager rollups and the org-wide
 * capability statement. Drafts are excluded — an unconfirmed profile must never
 * reach a customer-facing document.
 */
export async function listPublishedProfiles(
  ctx: GovConContext,
): Promise<MemberProfileWithCompleteness[]> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE);

  return guard("listPublishedProfiles", async () => {
    const profiles = await prisma.govConMemberProfile.findMany({
      where: { hubOrganizationId: ctx.tenantOrgId, status: "published" },
      include: profileInclude,
      orderBy: { updatedAt: "desc" },
    });
    return profiles.map((profile) => ({ profile, completeness: completenessFor(profile) }));
  });
}

export { AuthzError };
