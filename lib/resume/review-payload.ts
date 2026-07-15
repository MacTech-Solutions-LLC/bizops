/**
 * Builds the confirm-and-save payload from the resume review screen.
 *
 * Pure and React-free so the *exact* code the client runs can be tested against
 * `applyResumeProposalSchema`. This module exists because that seam broke twice:
 * the review UI serialises a `ResumeProposal` (AI-shaped, nulls throughout)
 * while the schema was written against hand-rolled test fixtures that happened
 * to contain no nulls and no "Present". Both sides passed their own tests and
 * failed together in the member's face.
 *
 * If you change the payload shape, change it here — and `resume-review-payload.test.ts`
 * will tell you whether the schema still accepts what the UI actually sends.
 */

import type {
  ProposedCertification,
  ProposedEducation,
  ProposedExperience,
  ProposedSkill,
} from "@/lib/resume";

/** The member's edited scalars plus the rows they kept checked. */
export interface ReviewSelection {
  headline: string;
  summary: string;
  laborCategory: string;
  /** Raw string from a number input — "" when cleared. */
  yearsExperience: string;
  clearanceLevel: string;
  /** Already filtered to the rows the member left included. */
  skills: ProposedSkill[];
  certifications: ProposedCertification[];
  education: ProposedEducation[];
  experience: ProposedExperience[];
  resumeSourceFilename: string;
  resumeParseModel: string | null;
}

/**
 * Produce the object posted to `applyProposalAction`.
 *
 * Nulls are preserved rather than stripped or stringified: null means "the
 * resume didn't say", which is a real answer the schema understands, and is
 * distinct from 0 or "".
 */
export function buildProposalPayload(selection: ReviewSelection) {
  return {
    headline: selection.headline.trim(),
    summary: selection.summary.trim(),
    laborCategory: selection.laborCategory.trim(),
    yearsExperience: selection.yearsExperience.trim(),
    clearanceLevel: selection.clearanceLevel,
    skills: selection.skills,
    certifications: selection.certifications,
    education: selection.education,
    experience: selection.experience,
    resumeSourceFilename: selection.resumeSourceFilename,
    resumeParseModel: selection.resumeParseModel,
  };
}

export function serialiseProposalPayload(selection: ReviewSelection): string {
  return JSON.stringify(buildProposalPayload(selection));
}
