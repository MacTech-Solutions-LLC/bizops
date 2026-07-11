"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { changeTaskStatus, createTask, updateTask } from "@/lib/services/tasks";
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

/** Create or update — `id` present ⇒ update. Redirects to the board on success. */
export async function saveTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const id = formData.get("id");
  const input = formToObject(formData);
  delete input.id;

  try {
    if (typeof id === "string" && id.length > 0) {
      await updateTask(ctx, id, input);
    } else {
      await createTask(ctx, input);
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/tasks");
  revalidatePath("/activity");
  redirect("/tasks");
}

/** Move a task to a new status column (used by drag-and-drop). */
export async function changeTaskStatusAction(id: string, status: string): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await changeTaskStatus(ctx, id, status);
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath("/tasks");
  revalidatePath("/activity");
  return { ok: true };
}
