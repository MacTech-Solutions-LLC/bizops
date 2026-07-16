/**
 * NAICS 2022 — the closed vocabulary a member's industry codes must come from.
 *
 * This module exists because of what an LLM does when asked for NAICS codes: it
 * produces six plausible digits. `541512` is real; a hallucinated neighbour is
 * indistinguishable without a lookup, and a fabricated NAICS code on a
 * capability statement is a bid-integrity problem, not a typo. So the model is
 * never trusted for the code itself — it proposes, and `validateNaics` keeps
 * only what appears in the Census table.
 *
 * Same reasoning as the certification allow-list in `lib/resume/heuristics.ts`:
 * a match cannot hallucinate. The difference is that here the model does the
 * matching (NAICS titles are not literal resume strings), so the deterministic
 * layer sits *after* the model rather than instead of it.
 *
 * Note what this cannot catch: a code that is real but wrong for this person.
 * That is why the title we display is always the official one rather than the
 * model's, why each suggestion carries a rationale, and why the member confirms
 * before anything is saved.
 *
 * Pure; no I/O. The table is checked in — see `scripts/generate-naics.ts`.
 */

import table from "./naics-2022.json";

const CODES: Record<string, string> = table.codes;

export const NAICS_REVISION = table.revision;
export const NAICS_SOURCE_URL = table.sourceUrl;

/** Max codes carried on a member profile. */
export const MAX_MEMBER_NAICS = 3;

export interface NaicsSuggestion {
  code: string;
  /** Official Census title. Never the model's wording. */
  title: string;
  /** Why this code, in the member's own resume terms. */
  rationale: string | null;
}

/** Is this a real 6-digit NAICS 2022 industry code? */
export function isNaicsCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(CODES, code.trim());
}

/** Official title for a code, or null if the code is not in the table. */
export function naicsTitle(code: string): string | null {
  return CODES[code.trim()] ?? null;
}

/** Every code, for callers that need the vocabulary (prompt building, tests). */
export function allNaicsCodes(): Array<{ code: string; title: string }> {
  return Object.entries(CODES).map(([code, title]) => ({ code, title }));
}

/**
 * Keep only real codes, de-duplicated, capped at `MAX_MEMBER_NAICS`.
 *
 * Titles are replaced with the official one — a model that returns the right
 * code with invented wording should not get that wording onto a capability
 * statement. Order is preserved: the model ranks, we filter.
 */
export function validateNaics(
  proposed: Array<{ code?: string | null; rationale?: string | null }>,
): NaicsSuggestion[] {
  const seen = new Set<string>();
  const out: NaicsSuggestion[] = [];

  for (const item of proposed) {
    const code = (item.code ?? "").trim();
    const title = naicsTitle(code);
    if (!title || seen.has(code)) continue;
    seen.add(code);
    const rationale = (item.rationale ?? "").trim();
    out.push({ code, title, rationale: rationale === "" ? null : rationale });
    if (out.length === MAX_MEMBER_NAICS) break;
  }

  return out;
}

/**
 * The candidate list handed to the model.
 *
 * Restricted to the sectors a GovCon services workforce plausibly sits in —
 * the full 1,012-code table is mostly farming, mining, and retail, which
 * wastes prompt budget and invites nonsense matches for a cleared systems
 * engineer. Anything outside these sectors is still *valid* if the model
 * somehow returns it; this only shapes what it sees.
 *
 *   23 Construction              51 Information
 *   31-33 Manufacturing          54 Professional/Scientific/Technical
 *   48-49 Transportation         56 Administrative/Support
 *   52 Finance                   61 Educational Services
 *   53 Real Estate               62 Health Care
 *   81 Other Services            92 Public Administration
 */
const CANDIDATE_SECTORS = [
  "23", "31", "32", "33", "48", "49", "51", "52", "53", "54", "56", "61", "62", "81", "92",
];

export function candidateNaics(): Array<{ code: string; title: string }> {
  return allNaicsCodes().filter((c) => CANDIDATE_SECTORS.includes(c.code.slice(0, 2)));
}
