import { z } from "zod";
import { GovConClearanceLevel, GovConFieldSource, GovConProfileStatus } from "@prisma/client";
import { optionalDate, optionalNullableText, optionalNumber } from "@/lib/validation/common";
import { parsePartialDate } from "@/lib/resume/dates";

/**
 * Member capability profile validation.
 *
 * Note what is absent: no name, email, phone, or address. Identity is Hub-owned
 * and resolved from `GovConContext` at render time. If a field like that shows
 * up in a form post it is dropped here rather than written — see
 * `AGENTS.md` (DR-2026-06-10-01).
 */

/**
 * A resume-derived partial date. Delegates to `parsePartialDate`, which absorbs
 * the shapes resumes actually use ("Present", "June 2019", "06/2019") and
 * returns null for ongoing, empty, or unreadable input.
 *
 * Deliberately lenient: this CANNOT fail validation. These values arrive from a
 * machine extraction, not the member's keyboard. The strict version rejected the
 * entire submission when the model wrote "Present" instead of null — so a member
 * could not save their profile at all, and the error pointed at
 * `experience.0.endedOn`, a field the review UI does not render. An optional
 * field must never be able to block a save.
 *
 * A manual date-entry form wants the opposite contract — tell the member exactly
 * what they mistyped. That needs its own strict validator; don't reuse this one.
 */
export const partialDateToDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : parsePartialDate(v)));

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
