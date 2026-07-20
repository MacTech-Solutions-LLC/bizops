import { z } from "zod";
import {
  optionalNullableText,
  stringArray,
} from "@/lib/validation/common";

/**
 * Directory (company address book) schemas. Closed vocabularies mirror the
 * Prisma enums exactly — a value outside them is a validation error, never a
 * guess. These schemas are shared by the in-app forms and the cross-app
 * service API, so they accept plain JSON as well as FormData-shaped input.
 */

export const DIRECTORY_ORG_TYPES = [
  "INTERNAL",
  "GOVERNMENT",
  "PRIME",
  "SUBCONTRACTOR",
  "TEAMING_PARTNER",
  "VENDOR",
  "CONSULTANT",
  "OTHER",
] as const;

export const DIRECTORY_CONTACT_KINDS = ["INTERNAL", "EXTERNAL"] as const;

export const DIRECTORY_ENTRY_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

/** Enum-or-absent; "" → undefined so untouched selects don't clear the field. */
function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .union([z.enum(values), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v));
}

const addressFields = {
  addressLine1: optionalNullableText,
  addressLine2: optionalNullableText,
  city: optionalNullableText,
  state: optionalNullableText,
  postalCode: optionalNullableText,
  country: optionalNullableText,
};

const organizationBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  orgType: optionalEnum(DIRECTORY_ORG_TYPES),
  abbreviation: optionalNullableText,
  website: optionalNullableText,
  email: optionalNullableText,
  phone: optionalNullableText,
  ...addressFields,
  uei: optionalNullableText,
  cageCode: optionalNullableText,
  tags: stringArray,
  notes: optionalNullableText,
  status: optionalEnum(DIRECTORY_ENTRY_STATUSES),
});

export const createDirectoryOrganizationSchema = organizationBase.extend({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export const updateDirectoryOrganizationSchema = organizationBase.extend({});

const contactBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  kind: optionalEnum(DIRECTORY_CONTACT_KINDS),
  title: optionalNullableText,
  department: optionalNullableText,
  organizationId: optionalNullableText,
  organizationName: optionalNullableText,
  email: optionalNullableText,
  phone: optionalNullableText,
  mobile: optionalNullableText,
  ...addressFields,
  linkedinUrl: optionalNullableText,
  tags: stringArray,
  notes: optionalNullableText,
  status: optionalEnum(DIRECTORY_ENTRY_STATUSES),
  hubUserId: optionalNullableText,
});

export const createDirectoryContactSchema = contactBase.extend({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export const updateDirectoryContactSchema = contactBase.extend({});

export const directoryContactFilterSchema = z.object({
  q: z.string().trim().optional(),
  kind: optionalEnum(DIRECTORY_CONTACT_KINDS),
  organizationId: z.string().optional(),
  status: optionalEnum(DIRECTORY_ENTRY_STATUSES),
  tag: z.string().trim().optional(),
  sortBy: z.enum(["name", "updatedAt", "createdAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const directoryOrganizationFilterSchema = z.object({
  q: z.string().trim().optional(),
  orgType: optionalEnum(DIRECTORY_ORG_TYPES),
  status: optionalEnum(DIRECTORY_ENTRY_STATUSES),
  sortBy: z.enum(["name", "updatedAt", "createdAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateDirectoryOrganizationInput = z.infer<typeof createDirectoryOrganizationSchema>;
export type UpdateDirectoryOrganizationInput = z.infer<typeof updateDirectoryOrganizationSchema>;
export type CreateDirectoryContactInput = z.infer<typeof createDirectoryContactSchema>;
export type UpdateDirectoryContactInput = z.infer<typeof updateDirectoryContactSchema>;
export type DirectoryContactFilter = z.infer<typeof directoryContactFilterSchema>;
export type DirectoryOrganizationFilter = z.infer<typeof directoryOrganizationFilterSchema>;
