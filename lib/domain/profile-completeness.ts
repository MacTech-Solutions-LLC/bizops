/**
 * Profile completeness scoring — pure, no I/O.
 *
 * Weights reflect what a Capability Statement actually needs, not what is easy
 * to fill in. Federal past performance and clearance are weighted heavily
 * because a capability statement without them cannot support a bid; a headline
 * is cheap to write and weighted accordingly.
 *
 * This is a *completion* aid for the member, not a quality score and not a
 * qualification check — a 100% profile is not a statement that the person is
 * qualified, cleared, or eligible for any given contract.
 */

import type { GovConClearanceLevel } from "@prisma/client";

export interface CompletenessInput {
  headline: string | null;
  summary: string | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  clearanceLevel: GovConClearanceLevel;
  skillCount: number;
  certificationCount: number;
  educationCount: number;
  experienceCount: number;
  federalExperienceCount: number;
}

export interface CompletenessFactor {
  key: string;
  label: string;
  weight: number;
  earned: number;
  /** Shown in the UI when the factor is not fully earned. */
  hint: string;
}

export interface CompletenessResult {
  /** 0-100. */
  score: number;
  factors: CompletenessFactor[];
  /** The highest-weight unearned factors, for the "what's next" prompt. */
  nextSteps: CompletenessFactor[];
}

/** Total weight is 100 so `score` reads directly as a percentage. */
const WEIGHTS = {
  headline: 8,
  summary: 12,
  laborCategory: 10,
  yearsExperience: 8,
  clearance: 15,
  skills: 15,
  certifications: 10,
  education: 7,
  experience: 15,
} as const;

/** Fractional credit up to a target, so partial progress is visible. */
function ratio(count: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(count / target, 1);
}

export function scoreCompleteness(input: CompletenessInput): CompletenessResult {
  const factors: CompletenessFactor[] = [
    {
      key: "headline",
      label: "Professional title",
      weight: WEIGHTS.headline,
      earned: input.headline ? WEIGHTS.headline : 0,
      hint: "Add the title you'd want on a capability statement.",
    },
    {
      key: "summary",
      label: "Professional summary",
      weight: WEIGHTS.summary,
      earned: input.summary ? WEIGHTS.summary : 0,
      hint: "A 2-3 sentence summary anchors your capability statement.",
    },
    {
      key: "laborCategory",
      label: "Labor category",
      weight: WEIGHTS.laborCategory,
      earned: input.laborCategory ? WEIGHTS.laborCategory : 0,
      hint: "Your LCAT determines which contract slots you can be proposed against.",
    },
    {
      key: "yearsExperience",
      label: "Years of experience",
      weight: WEIGHTS.yearsExperience,
      earned: input.yearsExperience && input.yearsExperience > 0 ? WEIGHTS.yearsExperience : 0,
      hint: "Most solicitations set a minimum years-of-experience bar.",
    },
    {
      key: "clearance",
      label: "Clearance",
      weight: WEIGHTS.clearance,
      // "none" is a legitimate, complete answer — an uncleared member has still
      // answered the question, and scoring them down would push people toward
      // overstating a clearance. Credit is for answering, not for holding one.
      earned: WEIGHTS.clearance,
      hint: "Confirm your clearance level.",
    },
    {
      key: "skills",
      label: "Skills",
      weight: WEIGHTS.skills,
      earned: Math.round(WEIGHTS.skills * ratio(input.skillCount, 8)),
      hint: "List at least 8 skills so you match more solicitation keywords.",
    },
    {
      key: "certifications",
      label: "Certifications",
      weight: WEIGHTS.certifications,
      earned: Math.round(WEIGHTS.certifications * ratio(input.certificationCount, 2)),
      hint: "Add certifications — many contracts require them by name.",
    },
    {
      key: "education",
      label: "Education",
      weight: WEIGHTS.education,
      earned: input.educationCount > 0 ? WEIGHTS.education : 0,
      hint: "Add your highest degree.",
    },
    {
      key: "experience",
      label: "Past performance",
      weight: WEIGHTS.experience,
      // Federal roles carry the weight here: two federal engagements earn full
      // credit, while commercial-only experience caps at roughly half.
      earned: Math.round(
        WEIGHTS.experience *
          Math.max(ratio(input.federalExperienceCount, 2), ratio(input.experienceCount, 3) * 0.5),
      ),
      hint: "Add your federal engagements — these are what past-performance volumes are built from.",
    },
  ];

  const score = Math.min(
    100,
    factors.reduce((sum, f) => sum + f.earned, 0),
  );

  const nextSteps = factors
    .filter((f) => f.earned < f.weight)
    .sort((a, b) => b.weight - a.weight - (b.earned - a.earned))
    .slice(0, 3);

  return { score, factors, nextSteps };
}
