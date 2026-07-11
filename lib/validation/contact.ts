import { z } from "zod";
import {
  optionalDate,
  optionalNullableText,
} from "@/lib/validation/common";

const contactBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  title: optionalNullableText,
  organizationName: optionalNullableText,
  agencyId: optionalNullableText,
  officeId: optionalNullableText,
  email: optionalNullableText,
  phone: optionalNullableText,
  contactType: optionalNullableText,
  acquisitionRole: optionalNullableText,
  decisionRole: optionalNullableText,
  influence: optionalNullableText,
  relationshipStrength: optionalNullableText,
  nextActionAt: optionalDate,
  nextAction: optionalNullableText,
  meetingNotes: optionalNullableText,
  sensitivityNotes: optionalNullableText,
});

export const createContactSchema = contactBase.extend({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export const updateContactSchema = contactBase.extend({});

export const logInteractionSchema = z.object({
  occurredAt: z.union([z.coerce.date(), z.literal(""), z.null()]).optional().transform(
    (v) => (v instanceof Date ? v : new Date()),
  ),
  channel: optionalNullableText,
  summary: z.string().trim().min(1, "Summary is required").max(2000),
  followUp: optionalNullableText,
  opportunityId: optionalNullableText,
});

export const contactFilterSchema = z.object({
  q: z.string().trim().optional(),
  agencyId: z.string().optional(),
  influence: z.string().optional(),
  sortBy: z.enum(["name", "lastInteractionAt", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type LogInteractionInput = z.infer<typeof logInteractionSchema>;
export type ContactFilter = z.infer<typeof contactFilterSchema>;
