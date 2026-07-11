"use server";

import { revalidatePath } from "next/cache";
import type { SuiteEmployeeOnboardingPacket } from "@/lib/hub/employee-onboarding";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { createTask } from "@/lib/services/tasks";
import { isAppError, ValidationError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  employeeOnboardingSchema,
  type EmployeeOnboardingInput,
} from "@/lib/validation/employee-onboarding";
import { requestSuiteEmployeeOnboarding } from "@/lib/hub/employee-onboarding";

export interface EmployeeOnboardingFormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
  packet?: SuiteEmployeeOnboardingPacket;
}

export async function createEmployeeOnboardingAction(
  _prev: EmployeeOnboardingFormState,
  formData: FormData,
): Promise<EmployeeOnboardingFormState> {
  const ctx = await requireGovConContext();
  const raw = formToInput(formData);

  let input: EmployeeOnboardingInput;
  try {
    input = parseOrThrow(employeeOnboardingSchema, raw);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    throw err;
  }

  try {
    const packet = await requestSuiteEmployeeOnboarding(ctx, input);
    await createTask(ctx, {
      title: `Complete onboarding for ${packet.hubUser.email}`,
      description: [
        `Hub user: ${packet.hubUser.id}`,
        `Membership: ${packet.membership.id}`,
        `Reference: ${packet.suiteObjectReference.id}`,
        `Apps: ${packet.onboarding.requestedApps.join(", ") || "none selected"}`,
      ].join("\n"),
      assigneeId: input.managerHubUserId || ctx.actorHubUserId,
      priority: "HIGH",
      status: "TODO",
      tags: ["employee-onboarding", "hub-profile"],
      checklist: packet.onboarding.followUps.map((item) => ({
        text: `${item.owner}: ${item.action}`,
        done: false,
      })),
    });
    revalidatePath("/team");
    revalidatePath("/tasks");
    revalidatePath("/activity");
    return { ok: true, packet };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
}

function formToInput(formData: FormData): Record<string, unknown> {
  return {
    email: formData.get("email") ?? "",
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    role: formData.get("role") ?? "customer_admin",
    title: formData.get("title") ?? "",
    department: formData.get("department") ?? "",
    managerHubUserId: formData.get("managerHubUserId") ?? "",
    startDate: formData.get("startDate") ?? "",
    appEntitlements: formData.getAll("appEntitlements").map(String),
    trainingRequirementKeys: formData.getAll("trainingRequirementKeys").map(String),
    signingAuthorityKinds: formData.getAll("signingAuthorityKinds").map(String),
    sendInvite: formData.get("sendInvite") === "true",
  };
}
