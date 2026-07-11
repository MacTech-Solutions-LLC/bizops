import { z } from "zod";
import { GovConBidOutcome } from "@prisma/client";
import { BID_CRITERION_MAX } from "@/lib/domain/bid-criteria";
import { optionalNullableText } from "@/lib/validation/common";

/** A single scored criterion row from the scorecard. */
export const bidCriterionSchema = z.object({
  key: z.string().trim().min(1),
  weight: z.coerce.number().min(0).max(100),
  score: z.coerce.number().min(0).max(BID_CRITERION_MAX),
  max: z.coerce.number().min(1).max(100).optional(),
});

export const upsertBidCriteriaSchema = z.object({
  criteria: z.array(bidCriterionSchema),
});

export const submitReviewSchema = z.object({
  reviewerId: z.string().trim().min(1, "Reviewer is required"),
  vote: z.nativeEnum(GovConBidOutcome).default(GovConBidOutcome.PENDING),
  score: z
    .union([z.coerce.number().min(0).max(100), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === "" || v === null ? null : v)),
  comments: optionalNullableText,
  approved: z
    .union([z.coerce.boolean(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === "" || v === null ? null : Boolean(v))),
});

/**
 * Recording a final decision — the human MUST pass the outcome explicitly. The
 * weighted score never derives it. `PENDING` is rejected here: recording means a
 * real outcome was chosen.
 */
export const recordDecisionSchema = z.object({
  outcome: z.nativeEnum(GovConBidOutcome).refine((o) => o !== GovConBidOutcome.PENDING, {
    message: "Choose a decision outcome",
  }),
  rationale: optionalNullableText,
  requiredApprovers: z
    .union([z.array(z.string()), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return undefined;
      if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }),
});

export type BidCriterionInput = z.infer<typeof bidCriterionSchema>;
export type UpsertBidCriteriaInput = z.infer<typeof upsertBidCriteriaSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type RecordDecisionInput = z.infer<typeof recordDecisionSchema>;
