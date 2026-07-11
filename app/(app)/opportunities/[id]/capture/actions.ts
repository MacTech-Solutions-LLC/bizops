"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import {
  addCaptureSection,
  updateCaptureSection,
  upsertCapturePlan,
} from "@/lib/services/capture";
import { isAppError, ValidationError } from "@/lib/errors";

export interface FormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}

function revalidateCapture(opportunityId: string) {
  revalidatePath(`/opportunities/${opportunityId}/capture`);
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/capture");
}

/** Save the capture plan narrative fields (useFormState). */
export async function saveCaptureAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const opportunityId = formData.get("opportunityId");
  if (typeof opportunityId !== "string" || !opportunityId) {
    return { ok: false, error: "Missing opportunity." };
  }
  const input = formToObject(formData);
  delete input.opportunityId;
  try {
    await upsertCapturePlan(ctx, opportunityId, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateCapture(opportunityId);
  return { ok: true };
}

/** Add or update a section. `sectionId` present ⇒ update. */
export async function saveSectionAction(
  opportunityId: string,
  sectionId: string | null,
  input: { title?: string; body?: string; ownerId?: string; unlock?: boolean },
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    if (sectionId) {
      await updateCaptureSection(ctx, opportunityId, sectionId, input);
    } else {
      await addCaptureSection(ctx, opportunityId, input);
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateCapture(opportunityId);
  return { ok: true };
}

export async function approveSectionAction(
  opportunityId: string,
  sectionId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await updateCaptureSection(ctx, opportunityId, sectionId, { status: "APPROVED" });
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateCapture(opportunityId);
  return { ok: true };
}

export async function lockSectionAction(
  opportunityId: string,
  sectionId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await updateCaptureSection(ctx, opportunityId, sectionId, { status: "LOCKED" });
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateCapture(opportunityId);
  return { ok: true };
}

export async function unlockSectionAction(
  opportunityId: string,
  sectionId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await updateCaptureSection(ctx, opportunityId, sectionId, { unlock: true });
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateCapture(opportunityId);
  return { ok: true };
}
