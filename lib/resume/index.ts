/**
 * Resume parsing pipeline.
 *
 * bytes → text (in memory) → heuristics → AI enrichment → merged proposal
 *
 * The output is a *proposal*, never a saved profile. Nothing here touches the
 * database: the member reviews the proposal and only what they confirm is
 * written (see lib/services/member-profile.ts). That split is what makes
 * "resumes are not stored" true in practice — by the time this function
 * returns, the bytes are unreferenced and the only thing that survives is
 * structured fields the member is about to see.
 *
 * Degradation: if the AI pass fails for any reason, the heuristic result still
 * comes back with `aiStatus: "failed"`. Onboarding must never hard-block on an
 * external API.
 */

import { GovConClearanceLevel, GovConFieldSource } from "@prisma/client";
import { logger } from "@/lib/logger";
import { isAppError } from "@/lib/errors";
import { extractResumeText } from "@/lib/resume/extract-text";
import { runHeuristics, type HeuristicResume } from "@/lib/resume/heuristics";
import { extractWithAI, RESUME_PARSE_MODEL, type ResumeExtraction } from "@/lib/resume/ai";

export interface ProposedSkill {
  name: string;
  category: string | null;
  proficiency: "familiar" | "proficient" | "expert";
  yearsExperience: number | null;
  source: GovConFieldSource;
}

export interface ProposedCertification {
  name: string;
  issuer: string | null;
  identifier: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  source: GovConFieldSource;
}

export interface ProposedEducation {
  institution: string;
  degree: string | null;
  field: string | null;
  completedOn: string | null;
  source: GovConFieldSource;
}

export interface ProposedExperience {
  organization: string;
  role: string | null;
  startedOn: string | null;
  endedOn: string | null;
  summary: string | null;
  isFederal: boolean;
  agency: string | null;
  contractName: string | null;
  source: GovConFieldSource;
}

export interface ResumeProposal {
  headline: string | null;
  summary: string | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  clearance: { level: GovConClearanceLevel; evidence: string | null };
  skills: ProposedSkill[];
  certifications: ProposedCertification[];
  education: ProposedEducation[];
  experience: ProposedExperience[];
  capabilityHighlights: string[];
  /** Federal agencies seen anywhere in the resume — feeds the org rollup. */
  agencies: string[];
  meta: {
    filename: string;
    parsedAt: string;
    model: string | null;
    aiStatus: "ok" | "failed" | "skipped";
    /** User-facing reason when aiStatus is "failed". */
    aiMessage: string | null;
    pageCount: number | null;
    /** Always false. Present so the "not stored" guarantee is visible in the
     * payload the UI receives, and so a regression flips a value someone reads. */
    resumeStored: false;
  };
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Do two certification names refer to the same credential?
 *
 * Exact match is not enough. The heuristic list holds canonical *base* names
 * ("AWS Certified Solutions Architect"), while a resume — and therefore the AI
 * pass — usually carries the graded full name ("AWS Certified Solutions
 * Architect - Professional"). Keying on the exact string shows the member the
 * same certification twice, once per pass.
 *
 * So: treat one as the same credential when it extends the other at a word
 * boundary. This can under-report someone who genuinely holds both a base and
 * an advanced cert of the same family (CCNA *and* CCNA Security) — they'd see
 * one row and can add the other. That is a better failure than a duplicate,
 * which every member with a graded cert would otherwise hit.
 */
function isSameCertification(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (!longer.startsWith(shorter)) return false;
  // Require a separator at the boundary so "CISSP" doesn't swallow "CISSP-ISSAP"
  // by accident of spelling — only by a real qualifier suffix.
  return /^[\s:–—-]/.test(longer.slice(shorter.length));
}

/**
 * Merge certifications from both passes.
 *
 * The heuristic pass proves the credential is really there (exact match on a
 * fixed vocabulary); the AI pass contributes the issuer, dates, and the precise
 * grade that a regex cannot see. Where they overlap we keep the more specific
 * name — "Solutions Architect - Professional" and "- Associate" are different
 * credentials on a bid, so dropping the grade to keep a canonical string would
 * lose the part that matters.
 */
function mergeCertifications(
  heuristic: string[],
  ai: ResumeExtraction["certifications"],
): ProposedCertification[] {
  const merged: ProposedCertification[] = heuristic.map((name) => ({
    name,
    issuer: null,
    identifier: null,
    issuedOn: null,
    expiresOn: null,
    source: GovConFieldSource.heuristic,
  }));

  for (const cert of ai) {
    const existing = merged.find((m) => isSameCertification(norm(m.name), norm(cert.name)));
    if (!existing) {
      merged.push({ ...cert, source: GovConFieldSource.ai });
      continue;
    }

    // Take the detail only the AI pass can see.
    existing.issuer ??= cert.issuer;
    existing.identifier ??= cert.identifier;
    existing.issuedOn ??= cert.issuedOn;
    existing.expiresOn ??= cert.expiresOn;

    if (norm(cert.name) !== norm(existing.name) && cert.name.length > existing.name.length) {
      // The AI's name is more specific. Take it — and re-label the row `ai`,
      // because the added grade was model-derived and hasn't been exact-matched.
      // Keeping the "Matched" badge here would overstate our confidence in a
      // string we never actually matched.
      existing.name = cert.name;
      existing.source = GovConFieldSource.ai;
    }
  }

  return merged;
}

/** Dedupe skills case-insensitively, keeping the first (richest) occurrence. */
function dedupeSkills(skills: ResumeExtraction["skills"]): ProposedSkill[] {
  const seen = new Map<string, ProposedSkill>();
  for (const skill of skills) {
    const key = norm(skill.name);
    if (!key || seen.has(key)) continue;
    seen.set(key, { ...skill, source: GovConFieldSource.ai });
  }
  return [...seen.values()];
}

/** Build the heuristic-only proposal — also the fallback when AI is unavailable. */
function baseProposal(
  heuristic: HeuristicResume,
  filename: string,
  pageCount: number | null,
): ResumeProposal {
  return {
    headline: null,
    summary: null,
    laborCategory: null,
    yearsExperience: heuristic.yearsExperience,
    clearance: heuristic.clearance,
    skills: [],
    certifications: mergeCertifications(heuristic.certifications, []),
    education: [],
    experience: [],
    capabilityHighlights: [],
    agencies: heuristic.agencies,
    meta: {
      filename,
      parsedAt: new Date().toISOString(),
      model: null,
      aiStatus: "failed",
      aiMessage: null,
      pageCount,
      resumeStored: false,
    },
  };
}

export interface ParseResumeOptions {
  /** Set false to skip the AI pass (tests, or a manual heuristics-only path). */
  useAI?: boolean;
}

/**
 * Parse resume bytes into a reviewable proposal. Does not persist anything.
 *
 * @throws ValidationError for an unreadable/oversized/unsupported file. AI
 * failures do not throw — they degrade to the heuristic result.
 */
export async function parseResume(
  bytes: Uint8Array,
  contentType: string,
  filename: string,
  options: ParseResumeOptions = {},
): Promise<ResumeProposal> {
  const { useAI = true } = options;

  // Throws on unreadable input — that IS a hard failure, since without text
  // there is nothing for either pass to work with.
  const { text, pageCount } = await extractResumeText(bytes, contentType, filename);
  const heuristic = runHeuristics(text);
  const proposal = baseProposal(heuristic, filename, pageCount ?? null);

  if (!useAI) {
    proposal.meta.aiStatus = "skipped";
    return proposal;
  }

  let ai: ResumeExtraction;
  try {
    ai = await extractWithAI(text);
  } catch (err) {
    // Degrade, don't fail: the member still gets clearance + certs + years from
    // the deterministic pass and can type the rest.
    logger.exception("resume_ai_extraction_failed", err, { filename });
    proposal.meta.aiStatus = "failed";
    proposal.meta.aiMessage = isAppError(err)
      ? err.userMessage
      : "Automatic parsing was unavailable. Please fill in the remaining fields.";
    return proposal;
  }

  return {
    ...proposal,
    headline: ai.headline,
    summary: ai.summary,
    laborCategory: ai.laborCategory,
    // Heuristics own the explicit claim; fall back to the model's read only
    // when the resume made no explicit "N years of experience" statement.
    yearsExperience: heuristic.yearsExperience,
    // Clearance stays heuristic-only, by design. See ai.ts.
    clearance: heuristic.clearance,
    skills: dedupeSkills(ai.skills),
    certifications: mergeCertifications(heuristic.certifications, ai.certifications),
    education: ai.education.map((e) => ({ ...e, source: GovConFieldSource.ai })),
    experience: ai.experience.map((e) => ({
      ...e,
      // Trust the deterministic agency list to correct a missed federal flag:
      // if the model said commercial but named a known agency, believe the name.
      isFederal: e.isFederal || (e.agency != null && heuristic.agencies.includes(e.agency)),
      source: GovConFieldSource.ai,
    })),
    capabilityHighlights: ai.capabilityHighlights,
    meta: { ...proposal.meta, model: RESUME_PARSE_MODEL, aiStatus: "ok", aiMessage: null },
  };
}

export { MAX_RESUME_BYTES, ACCEPTED_RESUME_TYPES } from "@/lib/resume/extract-text";

/** Exposed for tests. The merge rules are subtle enough (graded cert names,
 * provenance re-labelling) to be worth pinning directly rather than only
 * through a live API call. */
export const mergeCertificationsForTest = mergeCertifications;
