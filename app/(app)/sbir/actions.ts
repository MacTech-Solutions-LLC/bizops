"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { createTopic, updateTopic, upsertAssessment } from "@/lib/services/sbir";
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

export async function saveSbirTopicAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const id = formData.get("id");
  const input = formToObject(formData);
  delete input.id;

  let savedId: string;
  try {
    if (typeof id === "string" && id.length > 0) {
      savedId = (await updateTopic(ctx, id, input)).id;
    } else {
      savedId = (await createTopic(ctx, input)).id;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/sbir");
  revalidatePath(`/sbir/${savedId}`);
  redirect(`/sbir/${savedId}`);
}

export async function saveAssessmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const topicId = formData.get("topicId");
  if (typeof topicId !== "string" || topicId.length === 0) {
    return { ok: false, error: "Missing topic id." };
  }
  const input = formToObject(formData);
  delete input.topicId;

  try {
    await upsertAssessment(ctx, topicId, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath(`/sbir/${topicId}`);
  redirect(`/sbir/${topicId}?tab=assessment`);
}
