import { z } from "zod";
import {
  GovConFindingStatus,
  GovConRequirementStatus,
  GovConRequirementType,
  GovConReviewType,
  GovConSeverity,
  GovConVolumeStatus,
} from "@prisma/client";
import {
  optionalDate,
  optionalNullableText,
  optionalNumber,
  stringArray,
} from "@/lib/validation/common";

/** Boolean field; absent / "" → undefined, else truthy string / boolean. */
const optionalBoolean = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    if (typeof v === "boolean") return v;
    return v === "true" || v === "on" || v === "1";
  });

// --- Proposal ---------------------------------------------------------------

export const createProposalSchema = z.object({
  opportunityId: z.string().trim().min(1, "An opportunity is required"),
  title: z.string().trim().min(1, "Title is required").max(300),
  managerId: optionalNullableText,
  dueAt: optionalDate,
  status: z.nativeEnum(GovConVolumeStatus).optional(),
  notes: optionalNullableText,
  /** When true, seed the standard volume set on creation. */
  seedVolumes: optionalBoolean,
});

export const updateProposalSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  managerId: optionalNullableText,
  dueAt: optionalDate,
  status: z.nativeEnum(GovConVolumeStatus).optional(),
  notes: optionalNullableText,
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

// --- Volume -----------------------------------------------------------------

const volumeBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(300).optional(),
  ownerId: optionalNullableText,
  reviewerId: optionalNullableText,
  contributors: stringArray.optional(),
  status: z.nativeEnum(GovConVolumeStatus).optional(),
  dueAt: optionalDate,
  pageLimit: optionalNumber,
  currentPages: optionalNumber,
  outline: optionalNullableText,
  sourceMaterial: optionalNullableText,
  draftLocation: optionalNullableText,
  orderIndex: optionalNumber,
});

export const createVolumeSchema = volumeBase.extend({
  name: z.string().trim().min(1, "Name is required").max(300),
});

export const updateVolumeSchema = volumeBase.extend({
  expectedVersion: z.coerce.number().int().min(0).optional(),
});

export const changeVolumeStatusSchema = z.object({
  status: z.nativeEnum(GovConVolumeStatus),
});

// --- Requirement ------------------------------------------------------------

const requirementBase = z.object({
  refId: z.string().trim().min(1, "Requirement ID is required").max(120).optional(),
  sourceSection: optionalNullableText,
  text: z.string().trim().min(1, "Requirement text is required").optional(),
  requirementType: z.nativeEnum(GovConRequirementType).optional(),
  mandatory: optionalBoolean,
  responseSection: optionalNullableText,
  ownerId: optionalNullableText,
  volumeId: optionalNullableText,
  status: z.nativeEnum(GovConRequirementStatus).optional(),
  evidence: optionalNullableText,
  reviewerId: optionalNullableText,
  notes: optionalNullableText,
});

export const createRequirementSchema = requirementBase.extend({
  refId: z.string().trim().min(1, "Requirement ID is required").max(120),
  text: z.string().trim().min(1, "Requirement text is required"),
});

export const updateRequirementSchema = requirementBase;

export const assignRequirementSchema = z.object({
  ownerId: optionalNullableText,
  volumeId: optionalNullableText,
  status: z.nativeEnum(GovConRequirementStatus).optional(),
});

// --- Review -----------------------------------------------------------------

export const scheduleReviewSchema = z.object({
  type: z.nativeEnum(GovConReviewType),
  scheduledAt: optionalDate,
  scope: optionalNullableText,
  reviewers: stringArray.optional(),
  instructions: optionalNullableText,
});

export const updateReviewSchema = z.object({
  type: z.nativeEnum(GovConReviewType).optional(),
  scheduledAt: optionalDate,
  scope: optionalNullableText,
  reviewers: stringArray.optional(),
  instructions: optionalNullableText,
});

// --- Finding ----------------------------------------------------------------

export const addFindingSchema = z.object({
  summary: z.string().trim().min(1, "A summary is required").max(500),
  detail: optionalNullableText,
  severity: z.nativeEnum(GovConSeverity).optional(),
  ownerId: optionalNullableText,
});

export const resolveFindingSchema = z.object({
  status: z.nativeEnum(GovConFindingStatus),
  resolution: optionalNullableText,
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type CreateVolumeInput = z.infer<typeof createVolumeSchema>;
export type UpdateVolumeInput = z.infer<typeof updateVolumeSchema>;
export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
export type AssignRequirementInput = z.infer<typeof assignRequirementSchema>;
export type ScheduleReviewInput = z.infer<typeof scheduleReviewSchema>;
export type AddFindingInput = z.infer<typeof addFindingSchema>;
export type ResolveFindingInput = z.infer<typeof resolveFindingSchema>;

/** The standard proposal volume set, seeded on creation when requested. */
export const STANDARD_VOLUMES: string[] = [
  "Executive Summary",
  "Technical",
  "Management",
  "Past Performance",
  "Staffing",
  "Pricing",
  "Reps & Certs",
];
