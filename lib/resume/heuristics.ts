/**
 * Deterministic resume heuristics.
 *
 * Runs before the model and covers the things a regex is simply better at than
 * an LLM: fixed-vocabulary tokens (clearance levels, named certifications,
 * federal agencies) and date arithmetic. Three reasons this layer exists rather
 * than sending everything to the model:
 *
 *  1. These are closed vocabularies. "TS/SCI" either appears or it does not —
 *     that is a match, not a judgement, and a match cannot hallucinate.
 *  2. It still produces a usable profile when the AI call fails or the API key
 *     is unset, so onboarding never hard-blocks on an external service.
 *  3. Clearance especially must not be invented. A model that infers "probably
 *     Secret" from context would be a serious problem on a federal bid, so the
 *     model is never asked for it (see ai.ts) — only this exact-match pass sets
 *     it, and the member still confirms it.
 *
 * Every function here is pure: text in, structured data out. No I/O.
 */

import { GovConClearanceLevel } from "@prisma/client";

export interface HeuristicResume {
  clearance: { level: GovConClearanceLevel; evidence: string | null };
  certifications: string[];
  agencies: string[];
  yearsExperience: number | null;
  sections: Record<string, string>;
}

/**
 * Clearance patterns, ordered most-specific first — "Top Secret/SCI" must match
 * before "Top Secret", which must match before "Secret", or a TS/SCI resume
 * would be under-classified as Secret.
 */
const CLEARANCE_PATTERNS: Array<{ level: GovConClearanceLevel; re: RegExp }> = [
  { level: "ts_sci", re: /\b(?:TS\s*\/\s*SCI|top[-\s]secret\s*\/\s*SCI|\bSCI\b)/i },
  { level: "top_secret", re: /\b(?:TS|top[-\s]secret)\b/i },
  { level: "secret", re: /\bsecret\b/i },
  { level: "confidential", re: /\bconfidential\s+clearance\b/i },
  { level: "public_trust", re: /\bpublic\s+trust\b/i },
];

/**
 * Certifications relevant to federal bids. Kept as an explicit list rather than
 * a generic "\w+ Certified" pattern: precision matters more than recall here,
 * because the AI pass catches the long tail and the member can add their own.
 */
const CERTIFICATION_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "PMP", re: /\bPMP\b|\bproject\s+management\s+professional\b/i },
  { name: "CISSP", re: /\bCISSP\b/i },
  { name: "CISM", re: /\bCISM\b/i },
  { name: "CISA", re: /\bCISA\b/i },
  { name: "CompTIA Security+", re: /\bsecurity\s*\+|\bcomptia\s+security\b/i },
  { name: "CompTIA Network+", re: /\bnetwork\s*\+/i },
  { name: "CompTIA A+", re: /\bcomptia\s+a\s*\+/i },
  { name: "CEH", re: /\bCEH\b|\bcertified\s+ethical\s+hacker\b/i },
  { name: "AWS Certified Solutions Architect", re: /\baws\s+certified\s+solutions\s+architect\b/i },
  { name: "AWS Certified Developer", re: /\baws\s+certified\s+developer\b/i },
  { name: "Azure Solutions Architect", re: /\bazure\s+solutions\s+architect\b/i },
  { name: "CCNA", re: /\bCCNA\b/i },
  { name: "CCNP", re: /\bCCNP\b/i },
  { name: "ITIL", re: /\bITIL\b/i },
  { name: "Certified ScrumMaster", re: /\bcertified\s+scrum\s*master\b|\bCSM\b/i },
  { name: "Six Sigma Black Belt", re: /\bsix\s+sigma\b.*\bblack\s+belt\b/i },
  { name: "Security Clearance Adjudicator", re: /\badjudicator\s+certification\b/i },
  { name: "CMMC Registered Practitioner", re: /\bCMMC\b.*\b(?:RP|registered\s+practitioner)\b/i },
];

/** Federal customers. Drives `isFederal` on past performance and feeds the
 * agency-coverage rollup on the org-wide capability statement. */
const AGENCY_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "U.S. Army", re: /\b(?:U\.?S\.?\s*)?Army\b/i },
  { name: "U.S. Navy", re: /\b(?:U\.?S\.?\s*)?Navy\b|\bNAVSEA\b|\bNAVAIR\b|\bSPAWAR\b|\bNIWC\b/i },
  { name: "U.S. Air Force", re: /\bAir\s+Force\b|\bUSAF\b|\bAFRL\b/i },
  { name: "U.S. Marine Corps", re: /\bMarine\s+Corps\b|\bUSMC\b/i },
  { name: "U.S. Space Force", re: /\bSpace\s+Force\b|\bUSSF\b/i },
  { name: "DoD", re: /\b(?:DoD|Department\s+of\s+Defense)\b/i },
  { name: "DHS", re: /\b(?:DHS|Department\s+of\s+Homeland\s+Security)\b/i },
  { name: "DIA", re: /\bDIA\b|\bDefense\s+Intelligence\s+Agency\b/i },
  { name: "NSA", re: /\bNSA\b|\bNational\s+Security\s+Agency\b/i },
  { name: "DARPA", re: /\bDARPA\b/i },
  { name: "DISA", re: /\bDISA\b/i },
  { name: "VA", re: /\bDepartment\s+of\s+Veterans\s+Affairs\b|\bVeterans\s+Affairs\b/i },
  { name: "GSA", re: /\bGSA\b|\bGeneral\s+Services\s+Administration\b/i },
  { name: "NASA", re: /\bNASA\b/i },
  { name: "DOE", re: /\bDepartment\s+of\s+Energy\b/i },
  { name: "HHS", re: /\bHHS\b|\bHealth\s+and\s+Human\s+Services\b/i },
  { name: "FAA", re: /\bFAA\b/i },
  { name: "FBI", re: /\bFBI\b/i },
];

/** Canonical section name → the headings resumes actually use for it. */
const SECTION_ALIASES: Record<string, RegExp> = {
  summary: /^(?:professional\s+)?(?:summary|profile|objective|about)\b/i,
  experience: /^(?:work\s+|professional\s+|relevant\s+)?experience\b|^employment(?:\s+history)?\b|^work\s+history\b/i,
  education: /^education(?:\s+and\s+training)?\b|^academic\b/i,
  skills: /^(?:technical\s+|core\s+)?(?:skills|competencies|proficiencies)\b|^technologies\b/i,
  certifications: /^certifications?\b|^licenses?\b|^credentials\b/i,
  clearance: /^(?:security\s+)?clearance\b/i,
};

/** A line is a heading if it is short, non-terminal, and not a bullet. */
function looksLikeHeading(line: string): boolean {
  if (line.length === 0 || line.length > 60) return false;
  if (/^[-•*\d]/.test(line)) return false;
  if (/[.,;]$/.test(line)) return false;
  const isUpper = line === line.toUpperCase() && /[A-Z]/.test(line);
  const isTitle = /^[A-Z]/.test(line) && line.split(/\s+/).length <= 5;
  return isUpper || isTitle;
}

/**
 * Split a resume into canonical sections by scanning for heading lines. Text
 * before the first recognised heading is discarded — it is the contact block,
 * which is identity data this app deliberately does not want.
 */
export function splitSections(text: string): Record<string, string> {
  const lines = text.split("\n");
  const sections: Record<string, string[]> = {};
  let current: string | null = null;

  for (const line of lines) {
    let matched: string | null = null;
    if (looksLikeHeading(line)) {
      for (const [name, re] of Object.entries(SECTION_ALIASES)) {
        if (re.test(line)) {
          matched = name;
          break;
        }
      }
    }
    if (matched) {
      current = matched;
      sections[current] ??= [];
      continue;
    }
    if (current) sections[current].push(line);
  }

  return Object.fromEntries(
    Object.entries(sections).map(([k, v]) => [k, v.join("\n").trim()]),
  );
}

/**
 * Detect the highest clearance asserted. Returns the surrounding line as
 * evidence so the review UI can show *why* we think so — the member is
 * confirming a claim about themselves and deserves to see the source line.
 */
export function detectClearance(text: string): HeuristicResume["clearance"] {
  for (const { level, re } of CLEARANCE_PATTERNS) {
    const match = re.exec(text);
    if (!match) continue;
    // Require clearance-ish context for the bare "Secret"/"TS" tokens, which
    // otherwise match prose like "the secret to good design".
    const line =
      text
        .split("\n")
        .find((l) => re.test(l))
        ?.trim() ?? null;
    if (
      (level === "secret" || level === "top_secret") &&
      line &&
      !/clearance|cleared|SCI|polygraph|investigation|active|current/i.test(line)
    ) {
      continue;
    }
    return { level, evidence: line };
  }
  return { level: "none", evidence: null };
}

export function detectCertifications(text: string): string[] {
  return CERTIFICATION_PATTERNS.filter(({ re }) => re.test(text)).map(({ name }) => name);
}

export function detectAgencies(text: string): string[] {
  return AGENCY_PATTERNS.filter(({ re }) => re.test(text)).map(({ name }) => name);
}

/**
 * Years of experience. Prefers an explicit claim ("12+ years of experience");
 * falls back to the span between the earliest and latest 4-digit years present.
 * Returns null rather than guessing when neither signal is available.
 */
export function detectYearsExperience(text: string, now: Date = new Date()): number | null {
  const explicit = /\b(\d{1,2})\s*\+?\s*years?(?:\s+of)?\s+(?:experience|exp\b)/i.exec(text);
  if (explicit) {
    const n = Number(explicit[1]);
    if (n > 0 && n <= 60) return n;
  }

  const currentYear = now.getUTCFullYear();
  const years = [...text.matchAll(/\b(19[7-9]\d|20[0-4]\d)\b/g)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= 1970 && y <= currentYear);
  if (years.length < 2) return null;

  const span = currentYear - Math.min(...years);
  return span > 0 && span <= 60 ? span : null;
}

/** Run every deterministic pass over the extracted resume text. */
export function runHeuristics(text: string, now: Date = new Date()): HeuristicResume {
  return {
    clearance: detectClearance(text),
    certifications: detectCertifications(text),
    agencies: detectAgencies(text),
    yearsExperience: detectYearsExperience(text, now),
    sections: splitSections(text),
  };
}
