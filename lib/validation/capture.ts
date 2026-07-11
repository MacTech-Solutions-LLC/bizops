import { z } from "zod";
import { GovConCaptureSectionStatus } from "@prisma/client";
import { optionalNullableText, optionalText } from "@/lib/validation/common";

/**
 * Capture plan narrative fields. All optional (partial upsert): absent → omit,
 * "" → clear. `expectedVersion` guards optimistic concurrency.
 */
export const upsertCapturePlanSchema = z.object({
  ownerId: optionalNullableText,
  customerMission: optionalNullableText,
  customerProblem: optionalNullableText,
  acquisitionContext: optionalNullableText,
  procurementHistory: optionalNullableText,
  incumbentAnalysis: optionalNullableText,
  competitiveLandscape: optionalNullableText,
  stakeholderMap: optionalNullableText,
  relationshipMap: optionalNullableText,
  decisionRoles: optionalNullableText,
  strengths: optionalNullableText,
  weaknesses: optionalNullableText,
  competitorStrengths: optionalNullableText,
  competitorWeaknesses: optionalNullableText,
  discriminators: optionalNullableText,
  winThemes: optionalNullableText,
  ghostThemes: optionalNullableText,
  proofPoints: optionalNullableText,
  pastPerformanceAlignment: optionalNullableText,
  teamingGaps: optionalNullableText,
  staffingGaps: optionalNullableText,
  technicalGaps: optionalNullableText,
  readinessGaps: optionalNullableText,
  pricingPosture: optionalNullableText,
  captureActions: optionalNullableText,
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export const addCaptureSectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: optionalNullableText,
  ownerId: optionalNullableText,
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export const updateCaptureSectionSchema = z.object({
  title: optionalText,
  body: optionalNullableText,
  ownerId: optionalNullableText,
  orderIndex: z.coerce.number().int().min(0).optional(),
  status: z.nativeEnum(GovConCaptureSectionStatus).optional(),
  /** Explicit unlock request — only honored with capture-manage permission. */
  unlock: z.coerce.boolean().optional(),
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export type UpsertCapturePlanInput = z.infer<typeof upsertCapturePlanSchema>;
export type AddCaptureSectionInput = z.infer<typeof addCaptureSectionSchema>;
export type UpdateCaptureSectionInput = z.infer<typeof updateCaptureSectionSchema>;
