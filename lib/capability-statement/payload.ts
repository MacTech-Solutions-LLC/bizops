/**
 * Builds the confirm-and-save payload from the capability-statement review
 * screen.
 *
 * Pure and React-free for the same reason as `lib/resume/review-payload.ts`: the
 * exact object the browser posts is tested against `saveCapabilityStatementSchema`
 * in `tests/capability-statement-payload.test.ts`, so the UI→schema seam can't
 * drift silently. If you change the payload shape, change it here.
 *
 * Note what is NOT here: no company identity, NAICS, clearance, certifications,
 * or past performance. Those are hard facts assembled live from confirmed
 * sources and never round-trip through the browser — keeping them out of the
 * payload is what stops a tampered post from writing an unconfirmed fact onto
 * the statement.
 */

/** The member's edited narrative from the review screen. */
export interface StatementSelection {
  professionalSummary: string;
  coreCompetencies: string[];
  differentiators: string[];
  pastPerformanceHighlights: string[];
  /** The model that drafted this, or null when seeded/hand-written. */
  generateModel: string | null;
  /** Whether the suite (Hub) copy fed this draft — provenance for the UI. */
  syncedFromSuite: boolean;
}

export function buildStatementPayload(selection: StatementSelection) {
  return {
    // "" is a legitimate "cleared it" here — the schema resolves it to null.
    professionalSummary: selection.professionalSummary,
    coreCompetencies: selection.coreCompetencies,
    differentiators: selection.differentiators,
    pastPerformanceHighlights: selection.pastPerformanceHighlights,
    generateModel: selection.generateModel,
    syncedFromSuite: selection.syncedFromSuite,
  };
}

export function serialiseStatementPayload(selection: StatementSelection): string {
  return JSON.stringify(buildStatementPayload(selection));
}
