/**
 * Builds the confirm-and-save payload for the company-statement review screen.
 *
 * Pure and React-free like `lib/capability-statement/payload.ts`: the exact
 * object the browser posts is tested against `saveCompanyStatementSchema`, so
 * the UI→schema seam can't drift silently.
 *
 * Not here: hard facts and `sourceHubUserIds` — facts render live, and the
 * source-member provenance is stamped server-side at save time.
 */

/** The manager's edited narrative from the review screen. */
export interface CompanyStatementSelection {
  professionalSummary: string;
  coreCompetencies: string[];
  differentiators: string[];
  pastPerformanceHighlights: string[];
  /** The model that drafted this, or null when seeded/hand-written. */
  generateModel: string | null;
}

export function buildCompanyStatementPayload(selection: CompanyStatementSelection) {
  return {
    // "" is a legitimate "cleared it" — the schema resolves it to null.
    professionalSummary: selection.professionalSummary,
    coreCompetencies: selection.coreCompetencies,
    differentiators: selection.differentiators,
    pastPerformanceHighlights: selection.pastPerformanceHighlights,
    generateModel: selection.generateModel,
  };
}

export function serialiseCompanyStatementPayload(selection: CompanyStatementSelection): string {
  return JSON.stringify(buildCompanyStatementPayload(selection));
}
