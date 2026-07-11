import { z } from "zod";
import { GovConMilestoneStatus, GovConMilestoneType } from "@prisma/client";
import { optionalDate, optionalNullableText } from "@/lib/validation/common";

export const createMilestoneSchema = z.object({
  opportunityId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(300),
  type: z.nativeEnum(GovConMilestoneType).optional(),
  dueAt: optionalDate,
  status: z.nativeEnum(GovConMilestoneStatus).optional(),
  ownerId: optionalNullableText,
  notes: optionalNullableText,
});

export const updateMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  type: z.nativeEnum(GovConMilestoneType).optional(),
  dueAt: optionalDate,
  status: z.nativeEnum(GovConMilestoneStatus).optional(),
  ownerId: optionalNullableText,
  notes: optionalNullableText,
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
