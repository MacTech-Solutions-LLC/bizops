import { z } from "zod";
import { GovConSbirPhase, GovConSbirProgram, GovConStage } from "@prisma/client";
import {
  optionalDate,
  optionalNullableText,
  optionalNumber,
  stringArray,
} from "@/lib/validation/common";

/** 0..5 scorecard score; absent → undefined, "" / null → null. */
const optionalScore = z
  .union([z.coerce.number().int().min(0).max(5), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : typeof v === "number" ? v : null));

const topicBase = z.object({
  program: z.nativeEnum(GovConSbirProgram).optional(),
  component: optionalNullableText,
  agencyId: optionalNullableText,
  topicNumber: z.string().trim().min(1, "Topic number is required").max(120).optional(),
  topicTitle: z.string().trim().min(1, "Topic title is required").max(400).optional(),
  phase: z.nativeEnum(GovConSbirPhase).optional(),
  preReleaseDate: optionalDate,
  openDate: optionalDate,
  questionsDeadline: optionalDate,
  closeDate: optionalDate,
  technicalPoc: optionalNullableText,
  contractingPoc: optionalNullableText,
  objective: optionalNullableText,
  description: optionalNullableText,
  phaseIExpectations: optionalNullableText,
  phaseIIExpectations: optionalNullableText,
  phaseIIITransition: optionalNullableText,
  trl: optionalNumber,
  deliverables: optionalNullableText,
  awardRangeMin: optionalNumber,
  awardRangeMax: optionalNumber,
  periodOfPerformanceMonths: optionalNumber,
  eligibilityNotes: optionalNullableText,
  dataRightsNotes: optionalNullableText,
  requiredRegistrations: stringArray.optional(),
  submissionPortal: optionalNullableText,
  sourceUrl: optionalNullableText,
  stage: z.nativeEnum(GovConStage).optional(),
});

export const createSbirTopicSchema = topicBase.extend({
  topicNumber: z.string().trim().min(1, "Topic number is required").max(120),
  topicTitle: z.string().trim().min(1, "Topic title is required").max(400),
});

export const updateSbirTopicSchema = topicBase.extend({
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export const upsertSbirAssessmentSchema = z.object({
  missionAlignment: optionalScore,
  technicalNovelty: optionalScore,
  feasibility: optionalScore,
  existingIp: optionalScore,
  piAvailability: optionalScore,
  commercialization: optionalScore,
  phaseIiiPathway: optionalScore,
  transitionSponsor: optionalScore,
  pastPerformance: optionalScore,
  teamCompleteness: optionalScore,
  timeRemaining: optionalScore,
  proposalEffort: optionalScore,
  competitiveIntensity: optionalScore,
  expectedAwardValue: optionalNumber,
  recommendation: optionalNullableText,
  technicalConcept: optionalNullableText,
  workPlan: optionalNullableText,
  keyPersonnel: optionalNullableText,
  commercializationPlan: optionalNullableText,
  transitionPlan: optionalNullableText,
  dataRights: optionalNullableText,
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export const sbirFilterSchema = z.object({
  q: z.string().trim().optional(),
  program: z.nativeEnum(GovConSbirProgram).optional(),
  phase: z.nativeEnum(GovConSbirPhase).optional(),
  agencyId: z.string().optional(),
  includeArchived: z.coerce.boolean().default(false),
  sortBy: z.enum(["closeDate", "topicNumber", "updatedAt"]).default("closeDate"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateSbirTopicInput = z.infer<typeof createSbirTopicSchema>;
export type UpdateSbirTopicInput = z.infer<typeof updateSbirTopicSchema>;
export type UpsertSbirAssessmentInput = z.infer<typeof upsertSbirAssessmentSchema>;
export type SbirFilter = z.infer<typeof sbirFilterSchema>;
