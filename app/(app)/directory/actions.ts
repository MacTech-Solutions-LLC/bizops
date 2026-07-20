"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import {
  createDirectoryContact,
  createDirectoryOrganization,
  updateDirectoryContact,
  updateDirectoryOrganization,
} from "@/lib/services/directory";
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

export async function saveDirectoryContactAction(
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
      savedId = (await updateDirectoryContact(ctx, id, input)).id;
    } else {
      savedId = (await createDirectoryContact(ctx, input)).id;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/directory");
  revalidatePath(`/directory/${savedId}`);
  redirect(`/directory/${savedId}`);
}

export async function saveDirectoryOrganizationAction(
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
      savedId = (await updateDirectoryOrganization(ctx, id, input)).id;
    } else {
      savedId = (await createDirectoryOrganization(ctx, input)).id;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/directory");
  revalidatePath(`/directory/organizations/${savedId}`);
  redirect(`/directory/organizations/${savedId}`);
}
