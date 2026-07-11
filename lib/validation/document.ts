import { z } from "zod";
import { GovConDocumentCategory, GovConDocumentStatus } from "@prisma/client";
import { optionalDate, optionalNullableText } from "@/lib/validation/common";

const providers = ["local", "railway_volume", "s3", "azure_blob", "google_drive", "sharepoint", "github"] as const;

export const createDocumentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  category: z.nativeEnum(GovConDocumentCategory).optional(),
  status: z.nativeEnum(GovConDocumentStatus).optional(),
  version: optionalNullableText,
  opportunityId: optionalNullableText,
  partnerId: optionalNullableText,
  storageProvider: z.enum(providers).optional(),
  storageReference: optionalNullableText,
  sensitivityMarking: optionalNullableText,
  effectiveDate: optionalDate,
  expirationDate: optionalDate,
  notes: optionalNullableText,
});

export const updateDocumentSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  category: z.nativeEnum(GovConDocumentCategory).optional(),
  status: z.nativeEnum(GovConDocumentStatus).optional(),
  version: optionalNullableText,
  storageReference: optionalNullableText,
  sensitivityMarking: optionalNullableText,
  effectiveDate: optionalDate,
  expirationDate: optionalDate,
  notes: optionalNullableText,
});
