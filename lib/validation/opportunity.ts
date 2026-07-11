import { z } from "zod";
import {
  GovConCompetitionType,
  GovConHealth,
  GovConOpportunityType,
  GovConPriority,
  GovConStage,
  GovConTeamRole,
} from "@prisma/client";
import {
  optionalDate,
  optionalNullableText,
  optionalNumber,
  optionalPercent,
  stringArray,
} from "@/lib/validation/common";

/** Fields shared by create + update. All optional except on create where
 * `internalName` is required (enforced by the create schema). */
const opportunityBase = z.object({
  internalName: z.string().trim().min(1, "Internal name is required").max(300).optional(),
  solicitationTitle: optionalNullableText,
  solicitationNumber: optionalNullableText,
  noticeId: optionalNullableText,
  type: z.nativeEnum(GovConOpportunityType).optional(),
  sourceSystem: optionalNullableText,
  sourceUrl: optionalNullableText,

  agencyId: optionalNullableText,
  subAgency: optionalNullableText,
  officeId: optionalNullableText,
  command: optionalNullableText,
  contractingOffice: optionalNullableText,
  placeOfPerformance: optionalNullableText,
  setAside: optionalNullableText,
  naics: optionalNullableText,
  psc: optionalNullableText,
  vehicleId: optionalNullableText,
  contractType: optionalNullableText,
  competitionType: z.nativeEnum(GovConCompetitionType).optional(),

  estimatedValue: optionalNumber,
  minValue: optionalNumber,
  maxValue: optionalNumber,
  ceiling: optionalNumber,
  fundedValue: optionalNumber,
  periodOfPerformanceMonths: optionalNumber,
  basePeriodMonths: optionalNumber,
  optionPeriods: optionalNumber,

  postedDate: optionalDate,
  responseDeadline: optionalDate,
  questionsDeadline: optionalDate,
  siteVisitDate: optionalDate,
  industryDayDate: optionalDate,
  draftSolicitationDate: optionalDate,
  finalSolicitationDate: optionalDate,
  proposalDeadline: optionalDate,
  expectedAwardDate: optionalDate,
  actualAwardDate: optionalDate,
  debriefDate: optionalDate,

  stage: z.nativeEnum(GovConStage).optional(),
  health: z.nativeEnum(GovConHealth).optional(),
  priority: z.nativeEnum(GovConPriority).optional(),
  strategicFit: optionalPercent,
  pWin: optionalPercent,
  pGo: optionalPercent,
  teamRole: z.nativeEnum(GovConTeamRole).optional(),
  incumbent: optionalNullableText,
  competitors: stringArray.optional(),
  customerPainPoints: optionalNullableText,
  customerHotButtons: optionalNullableText,
  discriminators: optionalNullableText,
  winThemes: optionalNullableText,
  ghostThemes: optionalNullableText,
  blackHatNotes: optionalNullableText,
  solutionHypothesis: optionalNullableText,
  pricingHypothesis: optionalNullableText,
  keyPersonnelNeeds: optionalNullableText,
  clearanceNeeds: optionalNullableText,
  facilityNeeds: optionalNullableText,
  complianceRequirements: optionalNullableText,
  bidRationale: optionalNullableText,
  noBidRationale: optionalNullableText,

  captureOwnerId: optionalNullableText,
  proposalManagerId: optionalNullableText,
  executiveSponsorId: optionalNullableText,
  nextAction: optionalNullableText,
  nextActionDueAt: optionalDate,
});

export const createOpportunitySchema = opportunityBase.extend({
  internalName: z.string().trim().min(1, "Internal name is required").max(300),
});

export const updateOpportunitySchema = opportunityBase.extend({
  /** Optimistic concurrency guard — the version the client last read. */
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export const changeStageSchema = z.object({
  stage: z.nativeEnum(GovConStage),
  note: optionalNullableText,
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export const opportunityFilterSchema = z.object({
  q: z.string().trim().optional(),
  stage: z.union([z.nativeEnum(GovConStage), z.array(z.nativeEnum(GovConStage))]).optional(),
  health: z.nativeEnum(GovConHealth).optional(),
  priority: z.nativeEnum(GovConPriority).optional(),
  type: z.nativeEnum(GovConOpportunityType).optional(),
  agencyId: z.string().optional(),
  teamRole: z.nativeEnum(GovConTeamRole).optional(),
  captureOwnerId: z.string().optional(),
  includeArchived: z.coerce.boolean().default(false),
  sortBy: z
    .enum(["proposalDeadline", "estimatedValue", "pWin", "stage", "updatedAt", "internalName"])
    .default("proposalDeadline"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;
export type OpportunityFilter = z.infer<typeof opportunityFilterSchema>;
