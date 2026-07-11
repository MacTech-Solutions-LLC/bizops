"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { createContact, logInteraction, updateContact } from "@/lib/services/contacts";
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

export async function saveContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireGovConContext();
  const id = formData.get("id");
  const input = formToObject(formData);
  delete input.id;

  let savedId: string;
  try {
    if (typeof id === "string" && id.length > 0) {
      savedId = (await updateContact(ctx, id, input)).id;
    } else {
      savedId = (await createContact(ctx, input)).id;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${savedId}`);
  redirect(`/contacts/${savedId}`);
}

export async function logInteractionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || contactId.length === 0) {
    return { ok: false, error: "Missing contact id." };
  }
  const input = formToObject(formData);
  delete input.contactId;

  try {
    await logInteraction(ctx, contactId, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}
