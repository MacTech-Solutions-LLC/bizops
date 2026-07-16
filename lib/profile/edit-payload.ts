/**
 * Builds the save payload for the manual profile editor, and seeds that editor
 * from a stored profile.
 *
 * Pure and React-free for the same reason as `lib/resume/review-payload.ts`:
 * this is a seam between a UI's real state and a Zod schema, and that seam is
 * exactly where the resume path broke twice. `profile-edit-payload.test.ts`
 * exercises this module against `saveMemberProfileSchema` directly, so the code
 * under test is the code the browser runs.
 *
 * The date handling is the part worth understanding. Stored dates are UTC
 * midnight on the first of a month; `<input type="month">` speaks "YYYY-MM".
 * Both conversions here use UTC getters — a local-time round trip would walk a
 * January date back to the previous December for anyone west of Greenwich, and
 * silently re-dating a member's past performance is not an acceptable failure.
 */

import type { GovConClearanceLevel, GovConFieldSource } from "@prisma/client";

/** A row the member can edit. `source` is provenance carried through an edit —
 * a row the AI proposed stays marked as such until its content is changed. */
export interface EditableSkill {
  name: string;
  category: string | null;
  proficiency: "familiar" | "proficient" | "expert";
  yearsExperience: string;
  source: GovConFieldSource;
  confirmed: boolean;
}

export interface EditableCertification {
  name: string;
  issuer: string;
  identifier: string | null;
  issuedOn: string;
  expiresOn: string;
  source: GovConFieldSource;
  confirmed: boolean;
}

export interface EditableEducation {
  institution: string;
  degree: string;
  field: string;
  completedOn: string;
  source: GovConFieldSource;
  confirmed: boolean;
}

export interface EditableExperience {
  organization: string;
  role: string;
  startedOn: string;
  endedOn: string;
  summary: string;
  isFederal: boolean;
  agency: string;
  contractName: string;
  source: GovConFieldSource;
  confirmed: boolean;
}

export interface ProfileEditorState {
  headline: string;
  summary: string;
  laborCategory: string;
  /** Raw string from a number input — "" when cleared. */
  yearsExperience: string;
  clearanceLevel: GovConClearanceLevel;
  /** Six-digit codes, most relevant first. Titles are looked up, not stored. */
  naicsCodes: string[];
  skills: EditableSkill[];
  certifications: EditableCertification[];
  education: EditableEducation[];
  experience: EditableExperience[];
}

/** The stored shape this module reads. Structural rather than importing the
 * Prisma payload type, so the pure module stays free of a DB dependency. */
export interface StoredProfile {
  headline: string | null;
  summary: string | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  clearanceLevel: GovConClearanceLevel;
  naicsCodes: string[];
  skills: Array<{
    name: string;
    category: string | null;
    proficiency: string;
    yearsExperience: number | null;
    source: GovConFieldSource;
    confirmed: boolean;
  }>;
  certifications: Array<{
    name: string;
    issuer: string | null;
    identifier: string | null;
    issuedOn: Date | null;
    expiresOn: Date | null;
    source: GovConFieldSource;
    confirmed: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string | null;
    field: string | null;
    completedOn: Date | null;
    source: GovConFieldSource;
    confirmed: boolean;
  }>;
  experience: Array<{
    organization: string;
    role: string | null;
    startedOn: Date | null;
    endedOn: Date | null;
    summary: string | null;
    isFederal: boolean;
    agency: string | null;
    contractName: string | null;
    source: GovConFieldSource;
    confirmed: boolean;
  }>;
}

/** A stored date → the "YYYY-MM" an `<input type="month">` renders. */
export function toMonthInput(value: Date | string | null | undefined): string {
  if (value == null) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const text = (v: string | null | undefined): string => v ?? "";

/** Seed the editor from what is stored. */
export function toEditorState(profile: StoredProfile): ProfileEditorState {
  return {
    headline: text(profile.headline),
    summary: text(profile.summary),
    laborCategory: text(profile.laborCategory),
    yearsExperience: profile.yearsExperience != null ? String(profile.yearsExperience) : "",
    clearanceLevel: profile.clearanceLevel,
    naicsCodes: [...profile.naicsCodes],
    skills: profile.skills.map((s) => ({
      name: s.name,
      category: s.category,
      proficiency: (s.proficiency as EditableSkill["proficiency"]) ?? "proficient",
      yearsExperience: s.yearsExperience != null ? String(s.yearsExperience) : "",
      source: s.source,
      confirmed: s.confirmed,
    })),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: text(c.issuer),
      identifier: c.identifier,
      issuedOn: toMonthInput(c.issuedOn),
      expiresOn: toMonthInput(c.expiresOn),
      source: c.source,
      confirmed: c.confirmed,
    })),
    education: profile.education.map((e) => ({
      institution: e.institution,
      degree: text(e.degree),
      field: text(e.field),
      completedOn: toMonthInput(e.completedOn),
      source: e.source,
      confirmed: e.confirmed,
    })),
    experience: profile.experience.map((e) => ({
      organization: e.organization,
      role: text(e.role),
      startedOn: toMonthInput(e.startedOn),
      endedOn: toMonthInput(e.endedOn),
      summary: text(e.summary),
      isFederal: e.isFederal,
      agency: text(e.agency),
      contractName: text(e.contractName),
      source: e.source,
      confirmed: e.confirmed,
    })),
  };
}

/**
 * Produce the object posted to `saveProfileAction`.
 *
 * Empty strings are passed through rather than stripped: the schema's
 * `jsonNullableText` reads "" as "the member cleared this field" and writes
 * null, which is what clearing a field should do. Rows with a blank required
 * field are dropped here — an empty row is the member abandoning an "Add"
 * click, not a validation error worth interrupting them for.
 */
export function buildProfilePayload(state: ProfileEditorState) {
  return {
    headline: state.headline.trim(),
    summary: state.summary.trim(),
    laborCategory: state.laborCategory.trim(),
    yearsExperience: state.yearsExperience.trim(),
    clearanceLevel: state.clearanceLevel,
    naicsCodes: state.naicsCodes,
    skills: state.skills
      .filter((s) => s.name.trim() !== "")
      .map((s) => ({ ...s, name: s.name.trim(), yearsExperience: s.yearsExperience.trim() })),
    certifications: state.certifications
      .filter((c) => c.name.trim() !== "")
      .map((c) => ({ ...c, name: c.name.trim() })),
    education: state.education
      .filter((e) => e.institution.trim() !== "")
      .map((e) => ({ ...e, institution: e.institution.trim() })),
    experience: state.experience
      .filter((e) => e.organization.trim() !== "")
      .map((e) => ({ ...e, organization: e.organization.trim() })),
  };
}

export function serialiseProfilePayload(state: ProfileEditorState): string {
  return JSON.stringify(buildProfilePayload(state));
}
