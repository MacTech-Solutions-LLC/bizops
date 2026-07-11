import { z } from "zod";
import { optionalNullableText } from "@/lib/validation/common";

export const companyProfileSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required").max(300),
  dba: optionalNullableText,
  cageCode: optionalNullableText,
  uei: optionalNullableText,
  naicsPrimary: optionalNullableText,
});
