import { z } from "zod";
import { GovConClearanceLevel, GovConFieldSource, GovConProfileStatus } from "@prisma/client";
import { optionalDate, optionalNullableText, optionalNumber } from "@/lib/validation/common";
import { parsePartialDate } from "@/lib/resume/dates";
import { isNaicsCode, MAX_MEMBER_NAICS } from "@/lib/naics";

/**
 * Member capability profile validation.
 *
 * Note what is absent: no name, email, phone, or address. Identity is Hub-owned
 * and resolved from `GovConContext` at render time. If a field like that shows
 * up in a form post it is dropped here rather than written — see
 * `AGENTS.md` (DR-2026-06-10-01).
 */

/**
 * Text in a JSON payload — as opposed to a form post.
 *
 * The shared `optionalNullableText` is built for FormData, where every value is
 * a string and null is impossible, so it rejects null outright. The resume
 * review step submits JSON, and the extraction legitimately uses null to mean
 * "the resume didn't say" — an unknown issuer, no contract name. That is the
 * normal case, not an error: null is exactly what the AI is instructed to
 * return rather than guess. Rejecting it failed the whole save on the shape our
 * own pipeline produces.
 *
 * null (unknown) and "" (member cleared the field) both resolve to null — the
 * column is nullable and the distinction isn't one the member can act on.
 */
const jsonNullableText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  });

/**
 * An integer in a JSON payload. Accepts a number (AI), a numeric string (the
 * review form's number input), null, or "".
 *
 * Critically it does NOT coerce null to 0. "Unknown years of experience" and
 * "zero years of experience" are different claims, and only one of them is true
 * — a silent 0 would put an asserted falsehood on a capability statement.
 * Out-of-range and unparseable values become null rather than blocking the save,
 * consistent with the date handling: this payload is part machine-extracted, and
 * an optional field must not be able to stop a member saving their profile.
 */
const jsonNullableInt = (max: number) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const n = typeof v === "string" ? (v.trim() === "" ? NaN : Number(v)) : v;
      if (!Number.isFinite(n)) return null;
      const int = Math.trunc(n);
      return int >= 0 && int <= max ? int : null;
    });

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

/**
 * A date the member typed, from an `<input type="month">` ("2019-06") or "".
 *
 * The strict counterpart `partialDateToDate` warns about: that one absorbs
 * unreadable input because it comes from a machine extraction the member cannot
 * correct. Here the member is looking at the field, so an unreadable value is
 * reported back rather than silently dropped — a summary that quietly loses the
 * start date they just typed is worse than a validation error.
 */
export const monthInputToDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (v instanceof Date) return v;
    const trimmed = v.trim();
    if (trimmed === "") return null;
    const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
    const year = match ? Number(match[1]) : NaN;
    const month = match ? Number(match[2]) : NaN;
    if (!match || month < 1 || month > 12 || year < 1900 || year > 2200) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use a month and year, e.g. 2019-06" });
      return null;
    }
    return new Date(Date.UTC(year, month - 1, 1));
  });

/**
 * NAICS codes for a member profile.
 *
 * Re-validated here even though `lib/naics` already filtered the AI's output:
 * that ran in the parse step, and this payload arrives from the browser, where
 * anything could be in it. The closed vocabulary is the whole guarantee — an
 * unknown code is dropped rather than rejected, matching how the review screen
 * treats every other optional field (an unexpected value must not be able to
 * block a member saving their profile).
 */
const naicsCodes = z
  .union([z.array(z.string()), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null) return [];
    const seen = new Set<string>();
    return v
      .map((c) => c.trim())
      .filter((c) => isNaicsCode(c) && !seen.has(c) && seen.add(c))
      .slice(0, MAX_MEMBER_NAICS);
  });

export const skillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(120),
  category: jsonNullableText,
  proficiency: z.enum(["familiar", "proficient", "expert"]).default("proficient"),
  yearsExperience: jsonNullableInt(80),
  source: z.nativeEnum(GovConFieldSource).default(GovConFieldSource.manual),
  confirmed: z.coerce.boolean().default(true),
});

export const certificationSchema = z.object({
  name: z.string().trim().min(1, "Certification name is required").max(200),
  issuer: jsonNullableText,
  identifier: jsonNullableText,
  issuedOn: partialDateToDate,
  expiresOn: partialDateToDate,
  source: z.nativeEnum(GovConFieldSource).default(GovConFieldSource.manual),
  confirmed: z.coerce.boolean().default(true),
});

export const educationSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(200),
  degree: jsonNullableText,
  field: jsonNullableText,
  completedOn: partialDateToDate,
  source: z.nativeEnum(GovConFieldSource).default(GovConFieldSource.manual),
  confirmed: z.coerce.boolean().default(true),
});

export const experienceSchema = z.object({
  organization: z.string().trim().min(1, "Organization is required").max(200),
  role: jsonNullableText,
  startedOn: partialDateToDate,
  endedOn: partialDateToDate,
  summary: jsonNullableText,
  isFederal: z.coerce.boolean().default(false),
  agency: jsonNullableText,
  contractName: jsonNullableText,
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
  headline: jsonNullableText,
  summary: jsonNullableText,
  laborCategory: jsonNullableText,
  yearsExperience: jsonNullableInt(80),
  clearanceLevel: z.nativeEnum(GovConClearanceLevel).default(GovConClearanceLevel.none),
  naicsCodes,
  skills: z.array(skillSchema).max(100).default([]),
  certifications: z.array(certificationSchema).max(50).default([]),
  education: z.array(educationSchema).max(20).default([]),
  experience: z.array(experienceSchema).max(40).default([]),
  /** Provenance only; never a pointer to a stored file. */
  resumeSourceFilename: jsonNullableText,
  resumeParseModel: jsonNullableText,
});

/**
 * The manual-edit payload: the same scalars and full-replacement collections as
 * the resume path, minus the provenance fields — nothing here came from a
 * resume, so claiming a source file would be a lie in the audit trail.
 *
 * Dates use `monthInputToDate` rather than `partialDateToDate` because these
 * ones the member typed. Rows that originated from a resume round-trip through
 * here unchanged; the client renders their stored dates back as month inputs.
 */
export const saveMemberProfileSchema = z.object({
  headline: jsonNullableText,
  summary: jsonNullableText,
  laborCategory: jsonNullableText,
  yearsExperience: jsonNullableInt(80),
  clearanceLevel: z.nativeEnum(GovConClearanceLevel).default(GovConClearanceLevel.none),
  naicsCodes,
  skills: z.array(skillSchema).max(100).default([]),
  certifications: z
    .array(certificationSchema.extend({ issuedOn: monthInputToDate, expiresOn: monthInputToDate }))
    .max(50)
    .default([]),
  education: z
    .array(educationSchema.extend({ completedOn: monthInputToDate }))
    .max(20)
    .default([]),
  experience: z
    .array(experienceSchema.extend({ startedOn: monthInputToDate, endedOn: monthInputToDate }))
    .max(40)
    .default([]),
});

export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;
export type ApplyResumeProposalInput = z.infer<typeof applyResumeProposalSchema>;
export type SaveMemberProfileInput = z.infer<typeof saveMemberProfileSchema>;
