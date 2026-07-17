/**
 * Capability-statement assembly — pure, no I/O.
 *
 * Two jobs, both deterministic:
 *
 *  1. `assembleFacts` — gather the *hard facts* a capability statement renders
 *     from sources that are already member-confirmed: company identity, NAICS,
 *     clearance, certifications, federal past performance. These are NOT AI
 *     output and are NOT stored on the statement — they render live, so a
 *     corrected NAICS code or a renewed clearance shows through without
 *     regenerating anything. This is the never-guess rule applied to a document:
 *     the model never asserts one of these facts, it only phrases the narrative
 *     around them.
 *
 *  2. `assembleDraftInput` / `seedDraft` — build what the AI is asked to phrase,
 *     and the deterministic fallback used when the AI is unavailable. The
 *     fallback is seeded from confirmed facts only (skills → competencies,
 *     federal experience → past performance), never invented.
 */

import type { GovConClearanceLevel } from "@prisma/client";
import { CLEARANCE_LEVELS } from "@/lib/ui/enums";
import { naicsTitle } from "@/lib/naics";
import type { HubProfileSnapshot } from "@/lib/hub/profile";

/** The profile fields a statement is built from. `MemberProfile` satisfies it. */
export interface ProfileForStatement {
  headline: string | null;
  summary: string | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  clearanceLevel: GovConClearanceLevel;
  naicsCodes: string[];
  skills: Array<{ name: string; category: string | null }>;
  certifications: Array<{ name: string; issuer: string | null }>;
  experience: Array<{
    organization: string;
    role: string | null;
    startedOn: Date | null;
    endedOn: Date | null;
    summary: string | null;
    isFederal: boolean;
    agency: string | null;
    contractName: string | null;
  }>;
}

/** The company identity fields. `CompanyProfile` satisfies it. */
export interface CompanyForStatement {
  legalName: string;
  dba: string | null;
  cageCode: string | null;
  uei: string | null;
  naicsPrimary: string | null;
}

/** The member-confirmed narrative — what the AI drafts and the member edits. */
export interface CapabilityDraft {
  professionalSummary: string | null;
  coreCompetencies: string[];
  differentiators: string[];
  pastPerformanceHighlights: string[];
}

/** A past-performance row rendered from confirmed federal experience. */
export interface PastPerformanceFact {
  organization: string;
  role: string | null;
  agency: string | null;
  contractName: string | null;
  period: string;
  summary: string | null;
}

/**
 * The hard-facts block. Everything here is already member-confirmed elsewhere
 * (company profile, resume review) — the statement only re-displays it.
 */
export interface StatementFacts {
  company: {
    legalName: string;
    dba: string | null;
    cageCode: string | null;
    uei: string | null;
  } | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  clearanceLabel: string;
  /** Codes with looked-up titles — titles are never stored, always resolved. */
  naics: Array<{ code: string; title: string }>;
  certifications: Array<{ name: string; issuer: string | null }>;
  pastPerformance: PastPerformanceFact[];
  skills: string[];
}

function clearanceLabel(level: GovConClearanceLevel): string {
  return CLEARANCE_LEVELS.find((o) => o.value === level)?.label ?? level;
}

function year(value: Date | null): string | null {
  if (!value) return null;
  return String(value.getUTCFullYear());
}

function period(startedOn: Date | null, endedOn: Date | null): string {
  const start = year(startedOn);
  const end = year(endedOn);
  if (!start && !end) return "";
  return `${start ?? "?"}–${end ?? "Present"}`;
}

/**
 * Prefer the primary NAICS from the company profile, then the member's ranked
 * codes, de-duplicated with the primary kept first. Titles are always resolved
 * from the Census table; a code with no title is dropped rather than shown as
 * "Unknown" on a customer-facing document.
 */
function assembleNaics(
  profile: ProfileForStatement,
  company: CompanyForStatement | null,
): Array<{ code: string; title: string }> {
  const ordered: string[] = [];
  const primary = company?.naicsPrimary?.trim();
  if (primary) ordered.push(primary);
  for (const code of profile.naicsCodes) {
    if (!ordered.includes(code)) ordered.push(code);
  }
  return ordered
    .map((code) => ({ code, title: naicsTitle(code) }))
    .filter((n): n is { code: string; title: string } => Boolean(n.title));
}

export function assembleFacts(
  profile: ProfileForStatement,
  company: CompanyForStatement | null,
): StatementFacts {
  const federal = profile.experience.filter((e) => e.isFederal);
  // Federal past performance is the point of a GovCon statement; if there is
  // none confirmed, fall back to all experience rather than showing an empty
  // section — but never invent the "federal" marker.
  const pastSource = federal.length > 0 ? federal : profile.experience;

  return {
    company: company
      ? {
          legalName: company.legalName,
          dba: company.dba,
          cageCode: company.cageCode,
          uei: company.uei,
        }
      : null,
    laborCategory: profile.laborCategory,
    yearsExperience: profile.yearsExperience,
    clearanceLabel: clearanceLabel(profile.clearanceLevel),
    naics: assembleNaics(profile, company),
    certifications: profile.certifications.map((c) => ({ name: c.name, issuer: c.issuer })),
    pastPerformance: pastSource.map((e) => ({
      organization: e.organization,
      role: e.role,
      agency: e.agency,
      contractName: e.contractName,
      period: period(e.startedOn, e.endedOn),
      summary: e.summary,
    })),
    skills: profile.skills.map((s) => s.name),
  };
}

/**
 * The structured input the AI is asked to phrase into a statement.
 *
 * `summary`/`headline`/`naics` prefer the Hub's canonical copy when the suite
 * round-trip returned one — the statement should read from suite-wide truth,
 * not just this app's local row — and fall back to local values otherwise.
 * Facts (clearance, certifications, past performance) are local-confirmed only.
 */
export interface DraftInput {
  headline: string | null;
  summary: string | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  clearanceLabel: string;
  companyName: string | null;
  skills: string[];
  certifications: string[];
  naicsTitles: string[];
  federalPastPerformance: Array<{
    label: string;
    agency: string | null;
    contractName: string | null;
    summary: string | null;
  }>;
  /** True when the Hub copy fed the summary/headline/naics above. */
  fromSuite: boolean;
}

export function assembleDraftInput(
  profile: ProfileForStatement,
  company: CompanyForStatement | null,
  hub: HubProfileSnapshot | null,
): DraftInput {
  const facts = assembleFacts(profile, company);
  const federal = profile.experience.filter((e) => e.isFederal);

  return {
    headline: hub?.headline ?? profile.headline,
    summary: hub?.summary ?? profile.summary,
    laborCategory: hub?.laborCategory ?? profile.laborCategory,
    yearsExperience: hub?.yearsExperience ?? profile.yearsExperience,
    clearanceLabel: facts.clearanceLabel,
    companyName: company?.legalName ?? null,
    skills: facts.skills,
    certifications: profile.certifications.map((c) => c.name),
    naicsTitles: facts.naics.map((n) => n.title),
    federalPastPerformance: federal.map((e) => ({
      label: [e.role, e.organization].filter(Boolean).join(" · "),
      agency: e.agency,
      contractName: e.contractName,
      summary: e.summary,
    })),
    fromSuite: Boolean(hub),
  };
}

/**
 * A deterministic draft from confirmed facts alone — the fallback when the AI
 * is unavailable so the member can still develop the statement by hand. Seeds,
 * never asserts: every value here is copied from something the member already
 * confirmed, so it is safe to show even though no model reviewed it.
 */
export function seedDraft(profile: ProfileForStatement): CapabilityDraft {
  const federal = profile.experience.filter((e) => e.isFederal);
  const pastSource = federal.length > 0 ? federal : profile.experience;

  return {
    professionalSummary: profile.summary,
    // Top skills as competency bullets — the member reorders/edits before save.
    coreCompetencies: profile.skills.slice(0, 8).map((s) => s.name),
    differentiators: profile.certifications.map((c) =>
      c.issuer ? `${c.name} (${c.issuer})` : c.name,
    ),
    pastPerformanceHighlights: pastSource.slice(0, 5).map((e) => {
      const who = [e.role, e.organization].filter(Boolean).join(" · ");
      const forWhom = e.agency ? ` for ${e.agency}` : "";
      return e.summary ? `${who}${forWhom}: ${e.summary}` : `${who}${forWhom}`;
    }),
  };
}
