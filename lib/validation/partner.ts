import { z } from "zod";
import { GovConBusinessSize, GovConPartnerAgreementStatus } from "@prisma/client";
import {
  optionalNullableText,
  stringArray,
} from "@/lib/validation/common";

const partnerBase = z.object({
  legalName: z.string().trim().min(1, "Legal name is required").max(300).optional(),
  dba: optionalNullableText,
  uei: optionalNullableText,
  cageCode: optionalNullableText,
  businessSize: z.nativeEnum(GovConBusinessSize).optional(),
  socioeconomicStatus: stringArray.optional(),
  naicsCapabilities: stringArray.optional(),
  contractVehicles: stringArray.optional(),
  facilityClearance: optionalNullableText,
  keyCapabilities: optionalNullableText,
  pastPerformance: optionalNullableText,
  relationshipOwner: optionalNullableText,
  proposedRole: optionalNullableText,
  ndaStatus: z.nativeEnum(GovConPartnerAgreementStatus).optional(),
  teamingStatus: z.nativeEnum(GovConPartnerAgreementStatus).optional(),
  subcontractStatus: z.nativeEnum(GovConPartnerAgreementStatus).optional(),
  risk: optionalNullableText,
  notes: optionalNullableText,
});

export const createPartnerSchema = partnerBase.extend({
  legalName: z.string().trim().min(1, "Legal name is required").max(300),
});

export const updatePartnerSchema = partnerBase.extend({});

const partnerContactBase = z.object({
  name: z.string().trim().min(1, "Contact name is required").max(200).optional(),
  title: optionalNullableText,
  email: optionalNullableText,
  phone: optionalNullableText,
  isPrimary: z.coerce.boolean().optional(),
});

export const createPartnerContactSchema = partnerContactBase.extend({
  name: z.string().trim().min(1, "Contact name is required").max(200),
});

export const updatePartnerContactSchema = partnerContactBase.extend({});

export const partnerFilterSchema = z.object({
  q: z.string().trim().optional(),
  businessSize: z.nativeEnum(GovConBusinessSize).optional(),
  includeArchived: z.coerce.boolean().default(false),
  sortBy: z.enum(["legalName", "updatedAt", "businessSize"]).default("legalName"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type CreatePartnerContactInput = z.infer<typeof createPartnerContactSchema>;
export type PartnerFilter = z.infer<typeof partnerFilterSchema>;
