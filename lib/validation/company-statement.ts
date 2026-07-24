import { z } from "zod";

/**
 * Company-wide capability-statement confirm-payload validation.
 *
 * Mirrors `lib/validation/capability-statement.ts` — the payload is part
 * machine-drafted (the AI's bullets) and part manager-typed, so it absorbs the
 * draft shape leniently: empty bullets are dropped, not rejected.
 *
 * Absent here, deliberately: the hard facts (company identity, NAICS coverage,
 * clearance mix, certifications, past performance) and `sourceHubUserIds`.
 * Facts are assembled live from confirmed sources; the source-member list is
 * stamped server-side from the contributors that actually fed the save —
 * accepting either from the browser would let a tampered payload assert
 * provenance or facts nobody confirmed.
 */

const bulletList = z
  .array(z.string())
  .default([])
  .transform((rows) =>
    rows
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .map((r) => r.slice(0, 500)),
  )
  .refine((rows) => rows.length <= 30, {
    message: "Too many items for a one-page statement.",
  });

const nullableProse = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed.slice(0, 2000);
  });

export const saveCompanyStatementSchema = z.object({
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
});

export type SaveCompanyStatementInput = z.infer<typeof saveCompanyStatementSchema>;
