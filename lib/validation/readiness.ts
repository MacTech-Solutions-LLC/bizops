import { z } from "zod";
import { GovConReadinessStatus } from "@prisma/client";
import {
  optionalDate,
  optionalNullableText,
  optionalNumber,
} from "@/lib/validation/common";

const readinessBase = z.object({
  category: z.string().trim().min(1, "Category is required").max(120).optional(),
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  status: z.nativeEnum(GovConReadinessStatus).optional(),
  ownerId: optionalNullableText,
  issuer: optionalNullableText,
  identifier: optionalNullableText,
  effectiveDate: optionalDate,
  expirationDate: optionalDate,
  renewalDate: optionalDate,
  evidenceLink: optionalNullableText,
  reminderLeadDays: optionalNumber,
  notes: optionalNullableText,
});

export const createReadinessSchema = readinessBase.extend({
  category: z.string().trim().min(1, "Category is required").max(120),
  name: z.string().trim().min(1, "Name is required").max(200),
});

export const updateReadinessSchema = readinessBase.extend({});

export const readinessFilterSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(GovConReadinessStatus).optional(),
});

export type CreateReadinessInput = z.infer<typeof createReadinessSchema>;
export type UpdateReadinessInput = z.infer<typeof updateReadinessSchema>;
export type ReadinessFilter = z.infer<typeof readinessFilterSchema>;
