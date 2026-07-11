"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import {
  archiveOpportunity,
  changeStage,
  createOpportunity,
  updateOpportunity,
} from "@/lib/services/opportunities";
import { isAppError, ValidationError } from "@/lib/errors";

export interface FormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

/** Convert a FormData into a plain object (empty strings preserved for clears). */
function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue; // skip framework fields
    obj[key] = value;
  }
  return obj;
}

/** Create or update — `id` present ⇒ update. Redirects to the detail on success. */
export async function saveOpportunityAction(
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
      const updated = await updateOpportunity(ctx, id, input);
      savedId = updated.id;
    } else {
      const created = await createOpportunity(ctx, input);
      savedId = created.id;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${savedId}`);
  revalidatePath("/dashboard");
  redirect(`/opportunities/${savedId}`);
}

export async function changeStageAction(
  id: string,
  stage: string,
  note?: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await changeStage(ctx, id, { stage, note });
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function archiveOpportunityAction(id: string): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await archiveOpportunity(ctx, id);
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  redirect("/opportunities");
}
