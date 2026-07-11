import { z } from "zod";

export const employeeOnboardingSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().max(100).optional().or(z.literal("")),
  role: z.string().min(1).max(120).default("customer_admin"),
  title: z.string().max(160).optional().or(z.literal("")),
  department: z.string().max(160).optional().or(z.literal("")),
  managerHubUserId: z.string().max(200).optional().or(z.literal("")),
  startDate: z.string().max(40).optional().or(z.literal("")),
  appEntitlements: z.array(z.string().min(1)).default([]),
  trainingRequirementKeys: z.array(z.string().min(1)).default([]),
  signingAuthorityKinds: z.array(z.string().min(1)).default([]),
  sendInvite: z.boolean().default(false),
});

export type EmployeeOnboardingInput = z.infer<typeof employeeOnboardingSchema>;
