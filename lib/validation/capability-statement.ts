import { z } from "zod";

/**
 * Capability-statement confirm-payload validation.
 *
 * This is the schema the review UI's payload is checked against before anything
 * is stored — the seam that `tests/capability-statement-payload.test.ts` pins.
 * Like the resume payload it is part machine-drafted (the AI's bullets) and part
 * member-typed (their edits), so it absorbs the draft shape leniently: empty
 * bullets are dropped, not rejected, so a member removing a line never blocks a
 * save.
 *
 * Absent here, deliberately: the hard facts (company identity, NAICS, clearance,
 * certifications, past performance). Those are never sent from the browser and
 * never stored on the statement — they are assembled live from confirmed
 * sources. Accepting them here would let a tampered payload put an unconfirmed
 * CAGE code or clearance onto a federal document.
 */

/** One narrative section's bullets. Blanks dropped; each line length-capped so
 * a paste can't smuggle a wall of text onto a one-page statement. */
const bulletList = z
  .array(z.string())
  .default([])
  .transform((rows) =>
    rows
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .map((r) => r.slice(0, 500)),
  )
  // A capability statement is one page; more than this is not a statement.
  .refine((rows) => rows.length <= 30, {
    message: "Too many items for a one-page statement.",
  });

/** Nullable prose; "" (member cleared it) and null both resolve to null. */
const nullableProse = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed.slice(0, 2000);
  });

export const saveCapabilityStatementSchema = z.object({
  professionalSummary: nullableProse,
  coreCompetencies: bulletList,
  differentiators: bulletList,
  pastPerformanceHighlights: bulletList,
  /** Provenance: the model id that drafted this, or null when hand-written or
   * seeded without AI. Never trusted as anything but a label. */
  generateModel: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 100) : null)),
  /** Provenance only: whether the suite (Hub) copy fed this draft. A label for
   * the "synced from the MacTech suite" line, not a member-asserted fact. */
  syncedFromSuite: z
    .union([z.boolean(), z.null()])
    .optional()
    .transform((v) => v === true),
});

export type SaveCapabilityStatementInput = z.infer<typeof saveCapabilityStatementSchema>;
