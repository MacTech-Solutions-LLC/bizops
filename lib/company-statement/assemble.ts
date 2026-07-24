/**
 * Company-wide capability-statement assembly — pure, no I/O.
 *
 * The org-wide sibling of `lib/capability-statement/assemble.ts`, with the same
 * split and the same never-guess rule:
 *
 *  1. `assembleCompanyFacts` — aggregate the *hard facts* across every published
 *     member profile: NAICS coverage, team certifications, clearance mix,
 *     federal past performance. All of it is already member-confirmed; this
 *     module only counts, de-duplicates, and orders. Facts are NOT stored on
 *     the company statement — they render live, so a member renewing a cert or
 *     publishing a profile shows through without regeneration.
 *
 *  2. `assembleCompanyDraftInput` / `seedCompanyDraft` — what the AI is asked to
 *     phrase (each contributor's confirmed statement and profile content), and
 *     the deterministic fallback built by frequency-ranking confirmed content.
 *     Counts ("6 cleared members") are derived, never invented.
 */

import type { GovConClearanceLevel } from "@prisma/client";
import { CLEARANCE_LEVELS } from "@/lib/ui/enums";
import { naicsTitle } from "@/lib/naics";
import type { CapabilityDraft } from "@/lib/capability-statement/assemble";
import type { CompanyForStatement } from "@/lib/capability-statement/assemble";

/** One published member's confirmed content — the unit of ingestion. */
export interface MemberContribution {
  hubUserId: string;
  headline: string | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  clearanceLevel: GovConClearanceLevel;
  naicsCodes: string[];
  skills: string[];
  certifications: Array<{ name: string; issuer: string | null }>;
  federalPastPerformance: Array<{
    organization: string;
    role: string | null;
    agency: string | null;
    contractName: string | null;
    period: string;
    summary: string | null;
  }>;
  /** The member's own confirmed capability statement, when they have one.
   * This is the "best of the best" source — narrative a human already stands
   * behind. */
  statement: {
    professionalSummary: string | null;
    coreCompetencies: string[];
    differentiators: string[];
    pastPerformanceHighlights: string[];
  } | null;
}

/** The live hard-facts block for the org-wide statement. */
export interface CompanyStatementFacts {
  company: {
    legalName: string;
    dba: string | null;
    cageCode: string | null;
    uei: string | null;
  } | null;
  /** Published contributors the aggregates below are built from. */
  teamSize: number;
  /** Company primary first, then member codes by frequency. Titles resolved
   * live from the Census table, never stored. */
  naics: Array<{ code: string; title: string }>;
  /** Distinct labor categories across contributors. */
  laborCategories: string[];
  /** Members per clearance level, "none" omitted — highest first. */
  clearanceMix: Array<{ label: string; count: number }>;
  /** De-duplicated team certifications with holder counts, most held first. */
  certifications: Array<{ name: string; count: number }>;
  /** Federal engagements across the team, de-duplicated. */
  pastPerformance: Array<{
    organization: string;
    agency: string | null;
    contractName: string | null;
    period: string;
  }>;
}

const CLEARANCE_ORDER: GovConClearanceLevel[] = [
  "ts_sci",
  "top_secret",
  "secret",
  "confidential",
  "public_trust",
];

function clearanceLabel(level: GovConClearanceLevel): string {
  return CLEARANCE_LEVELS.find((o) => o.value === level)?.label ?? level;
}

/** Count values case-insensitively, keeping the first-seen casing. */
function countBy(values: string[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, { name: string; count: number }>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key) continue;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { name: value.trim(), count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function aggregateNaics(
  company: CompanyForStatement | null,
  contributions: MemberContribution[],
): Array<{ code: string; title: string }> {
  const ordered: string[] = [];
  const primary = company?.naicsPrimary?.trim();
  if (primary) ordered.push(primary);
  const byFrequency = countBy(contributions.flatMap((c) => c.naicsCodes));
  for (const { name: code } of byFrequency) {
    if (!ordered.includes(code)) ordered.push(code);
  }
  return ordered
    .map((code) => ({ code, title: naicsTitle(code) }))
    .filter((n): n is { code: string; title: string } => Boolean(n.title));
}

function aggregatePastPerformance(
  contributions: MemberContribution[],
): CompanyStatementFacts["pastPerformance"] {
  const seen = new Set<string>();
  const rows: CompanyStatementFacts["pastPerformance"] = [];
  for (const c of contributions) {
    for (const e of c.federalPastPerformance) {
      const key = [e.organization, e.agency ?? "", e.contractName ?? ""]
        .join("|")
        .toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        organization: e.organization,
        agency: e.agency,
        contractName: e.contractName,
        period: e.period,
      });
    }
  }
  return rows;
}

export function assembleCompanyFacts(
  company: CompanyForStatement | null,
  contributions: MemberContribution[],
): CompanyStatementFacts {
  const clearanceMix = CLEARANCE_ORDER.map((level) => ({
    label: clearanceLabel(level),
    count: contributions.filter((c) => c.clearanceLevel === level).length,
  })).filter((c) => c.count > 0);

  return {
    company: company
      ? {
          legalName: company.legalName,
          dba: company.dba,
          cageCode: company.cageCode,
          uei: company.uei,
        }
      : null,
    teamSize: contributions.length,
    naics: aggregateNaics(company, contributions),
    laborCategories: countBy(
      contributions.map((c) => c.laborCategory ?? "").filter(Boolean),
    ).map((l) => l.name),
    clearanceMix,
    certifications: countBy(contributions.flatMap((c) => c.certifications.map((x) => x.name))),
    pastPerformance: aggregatePastPerformance(contributions),
  };
}

/**
 * The structured input the AI is asked to phrase into an org-wide statement.
 * Everything in it is member-confirmed or deterministically derived from
 * member-confirmed content; per-member blocks carry no names — a company
 * statement describes the team, not individuals.
 */
export interface CompanyDraftInput {
  companyName: string | null;
  dba: string | null;
  teamSize: number;
  naicsTitles: string[];
  laborCategories: string[];
  clearanceMix: string[];
  certifications: string[];
  members: Array<{
    headline: string | null;
    laborCategory: string | null;
    yearsExperience: number | null;
    skills: string[];
    /** Their confirmed statement's bullets — the best-of-best content. */
    coreCompetencies: string[];
    differentiators: string[];
    pastPerformanceHighlights: string[];
  }>;
  federalPastPerformance: Array<{
    organization: string;
    agency: string | null;
    contractName: string | null;
    summary: string | null;
  }>;
}

/** Keep the prompt bounded however large the org grows. */
const MAX_MEMBERS_IN_PROMPT = 25;
const MAX_SKILLS_PER_MEMBER = 12;

export function assembleCompanyDraftInput(
  company: CompanyForStatement | null,
  contributions: MemberContribution[],
): CompanyDraftInput {
  const facts = assembleCompanyFacts(company, contributions);

  const seenPp = new Set<string>();
  const federalPastPerformance: CompanyDraftInput["federalPastPerformance"] = [];
  for (const c of contributions) {
    for (const e of c.federalPastPerformance) {
      const key = [e.organization, e.agency ?? "", e.contractName ?? ""].join("|").toLowerCase();
      if (seenPp.has(key)) continue;
      seenPp.add(key);
      federalPastPerformance.push({
        organization: e.organization,
        agency: e.agency,
        contractName: e.contractName,
        summary: e.summary,
      });
    }
  }

  return {
    companyName: company?.legalName ?? null,
    dba: company?.dba ?? null,
    teamSize: facts.teamSize,
    naicsTitles: facts.naics.map((n) => n.title),
    laborCategories: facts.laborCategories,
    clearanceMix: facts.clearanceMix.map((c) => `${c.count} × ${c.label}`),
    certifications: facts.certifications.map((c) =>
      c.count > 1 ? `${c.name} (${c.count} holders)` : c.name,
    ),
    members: contributions.slice(0, MAX_MEMBERS_IN_PROMPT).map((c) => ({
      headline: c.headline,
      laborCategory: c.laborCategory,
      yearsExperience: c.yearsExperience,
      skills: c.skills.slice(0, MAX_SKILLS_PER_MEMBER),
      coreCompetencies: c.statement?.coreCompetencies ?? [],
      differentiators: c.statement?.differentiators ?? [],
      pastPerformanceHighlights: c.statement?.pastPerformanceHighlights ?? [],
    })),
    federalPastPerformance,
  };
}

/**
 * A deterministic org-wide draft from confirmed content alone — the fallback
 * when the AI is unavailable. Frequency-ranks what members already confirmed;
 * copies and counts, never asserts.
 */
export function seedCompanyDraft(contributions: MemberContribution[]): CapabilityDraft {
  // Prefer competencies members put on their own confirmed statements; fall
  // back to raw skills for members without one.
  const competencySource = contributions.flatMap((c) =>
    c.statement && c.statement.coreCompetencies.length > 0
      ? c.statement.coreCompetencies
      : c.skills,
  );
  const certs = countBy(contributions.flatMap((c) => c.certifications.map((x) => x.name)));

  const clearedCount = contributions.filter((c) => c.clearanceLevel !== "none").length;
  const differentiators = certs.slice(0, 6).map((c) =>
    c.count > 1 ? `${c.name} (${c.count} team members)` : c.name,
  );
  if (clearedCount > 0) {
    differentiators.push(
      clearedCount === 1 ? "1 cleared team member" : `${clearedCount} cleared team members`,
    );
  }

  const highlights: string[] = [];
  for (const c of contributions) {
    for (const line of c.statement?.pastPerformanceHighlights ?? []) {
      if (!highlights.includes(line)) highlights.push(line);
    }
  }
  if (highlights.length === 0) {
    for (const e of aggregatePastPerformance(contributions).slice(0, 8)) {
      const head = [e.organization, e.agency, e.contractName].filter(Boolean).join(" · ");
      highlights.push(e.period ? `${head} (${e.period})` : head);
    }
  }

  return {
    professionalSummary: null,
    coreCompetencies: countBy(competencySource)
      .slice(0, 8)
      .map((c) => c.name),
    differentiators,
    pastPerformanceHighlights: highlights.slice(0, 10),
  };
}
