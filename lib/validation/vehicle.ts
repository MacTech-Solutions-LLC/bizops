import { z } from "zod";
import { GovConVehicleStatus } from "@prisma/client";
import {
  optionalDate,
  optionalNullableText,
  optionalNumber,
  stringArray,
} from "@/lib/validation/common";

const vehicleBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(300).optional(),
  vehicleType: optionalNullableText,
  agency: optionalNullableText,
  contractNumber: optionalNullableText,
  primeHolder: optionalNullableText,
  subcontractAccess: z.coerce.boolean().optional(),
  pools: stringArray.optional(),
  naicsCodes: stringArray.optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  optionPeriods: optionalNumber,
  ceiling: optionalNumber,
  orderingStatus: optionalNullableText,
  status: z.nativeEnum(GovConVehicleStatus).optional(),
  renewalActions: optionalNullableText,
  notes: optionalNullableText,
});

export const createVehicleSchema = vehicleBase.extend({
  name: z.string().trim().min(1, "Name is required").max(300),
});

export const updateVehicleSchema = vehicleBase.extend({});

export const vehicleFilterSchema = z.object({
  q: z.string().trim().optional(),
  status: z.nativeEnum(GovConVehicleStatus).optional(),
  sortBy: z.enum(["name", "endDate", "ceiling", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleFilter = z.infer<typeof vehicleFilterSchema>;
