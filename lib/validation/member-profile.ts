import { z } from "zod";
import { GovConClearanceLevel, GovConFieldSource, GovConProfileStatus } from "@prisma/client";
import { optionalDate, optionalNullableText, optionalNumber } from "@/lib/validation/common";

/**
 * Member capability profile validation.
 *
 * Note what is absent: no name, email, phone, or address. Identity is Hub-owned
 * and resolved from `GovConContext` at render time. If a field like that shows
 * up in a form post it is dropped here rather than written — see
 * `AGENTS.md` (DR-2026-06-10-01).
 */

/** Accepts "2019", "2019-06", or a full date; normalises to the first of the
 * month/year. Resumes rarely state a precise day and we must not invent one. */
export const partialDateToDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    if (v instanceof Date) return v;
    const raw = v.trim();
    if (/^\d{4}$/.test(raw)) return new Date(`${raw}-01-01T00:00:00Z`);
    if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01T00:00:00Z`);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use YYYY, YYYY-MM, or YYYY-MM-DD" });
      return z.NEVER;
    }
    return parsed;
  });

export const skillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(120),
  category: optionalNullableText,
  proficiency: z.enum(["familiar", "proficient", "expert"]).default("proficient"),
  yearsExperience: optionalNumber,
  source: z.nativeEnum(GovConFieldSource).default(GovConFieldSource.manual),
  confirmed: z.coerce.boolean().default(true),
});

export const certificationSchema = z.object({
  name: z.string().trim().min(1, "Certification name is required").max(200),
  issuer: optionalNullableText,
  identifier: optionalNullableText,
  issuedOn: partialDateToDate,
  expiresOn: partialDateToDate,
  source: z.nativeEnum(GovConFieldSource).default(GovConFieldSource.manual),
  confirmed: z.coerce.boolean().default(true),
});

export const educationSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(200),
  degree: optionalNullableText,
  field: optionalNullableText,
  completedOn: partialDateToDate,
  source: z.nativeEnum(GovConFieldSource).default(GovConFieldSource.manual),
  confirmed: z.coerce.boolean().default(true),
});

export const experienceSchema = z.object({
  organization: z.string().trim().min(1, "Organization is required").max(200),
  role: optionalNullableText,
  startedOn: partialDateToDate,
  endedOn: partialDateToDate,
  summary: optionalNullableText,
  isFederal: z.coerce.boolean().default(false),
  agency: optionalNullableText,
  contractName: optionalNullableText,
  source: z.nativeEnum(GovConFieldSource).default(GovConFieldSource.manual),
  confirmed: z.coerce.boolean().default(true),
});

/** Scalar fields of the profile itself. Used for the manual-edit path. */
export const updateMemberProfileSchema = z.object({
  headline: optionalNullableText,
  summary: optionalNullableText,
  laborCategory: optionalNullableText,
  yearsExperience: optionalNumber,
  clearanceLevel: z.nativeEnum(GovConClearanceLevel).optional(),
  clearanceGrantedOn: optionalDate,
  investigationType: optionalNullableText,
  status: z.nativeEnum(GovConProfileStatus).optional(),
});

/**
 * The confirm-and-save payload from the resume review step. This is the only
 * path by which parsed data reaches the database, and every collection is a
 * full replacement of what the member reviewed — rows they deleted in the UI
 * are simply absent here, which is what makes "reject a bad AI guess" work.
 */
export const applyResumeProposalSchema = z.object({
  headline: optionalNullableText,
  summary: optionalNullableText,
  laborCategory: optionalNullableText,
  yearsExperience: optionalNumber,
  clearanceLevel: z.nativeEnum(GovConClearanceLevel).default(GovConClearanceLevel.none),
  skills: z.array(skillSchema).max(100).default([]),
  certifications: z.array(certificationSchema).max(50).default([]),
  education: z.array(educationSchema).max(20).default([]),
  experience: z.array(experienceSchema).max(40).default([]),
  /** Provenance only; never a pointer to a stored file. */
  resumeSourceFilename: optionalNullableText,
  resumeParseModel: optionalNullableText,
});

export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;
export type ApplyResumeProposalInput = z.infer<typeof applyResumeProposalSchema>;
