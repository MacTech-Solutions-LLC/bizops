"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import {
  archivePartner,
  createPartner,
  createPartnerContact,
  deletePartnerContact,
  updatePartner,
  updatePartnerContact,
} from "@/lib/services/partners";
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

export async function savePartnerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireGovConContext();
  const id = formData.get("id");
  const input = formToObject(formData);
  delete input.id;

  let savedId: string;
  try {
    if (typeof id === "string" && id.length > 0) {
      savedId = (await updatePartner(ctx, id, input)).id;
    } else {
      savedId = (await createPartner(ctx, input)).id;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/partners");
  revalidatePath(`/partners/${savedId}`);
  redirect(`/partners/${savedId}`);
}

export async function archivePartnerAction(id: string): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await archivePartner(ctx, id);
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath("/partners");
  redirect("/partners");
}

export async function addPartnerContactAction(
  partnerId: string,
  input: Record<string, unknown>,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await createPartnerContact(ctx, partnerId, input);
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: "Check the fields.", issues: err.issues };
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}

export async function updatePartnerContactAction(
  partnerId: string,
  contactId: string,
  input: Record<string, unknown>,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await updatePartnerContact(ctx, contactId, input);
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: "Check the fields.", issues: err.issues };
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}

export async function deletePartnerContactAction(
  partnerId: string,
  contactId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await deletePartnerContact(ctx, contactId);
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}
