"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { createProposal, updateProposal } from "@/lib/services/proposals";
import { isAppError, ValidationError } from "@/lib/errors";
import { formDataToObject } from "@/lib/forms";

export interface FormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

/** Create or update a proposal — `id` present ⇒ update. Redirects to detail. */
export async function saveProposalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const id = formData.get("id");
  const input = formDataToObject(formData);
  delete input.id;

  let savedId: string;
  try {
    if (typeof id === "string" && id.length > 0) {
      const updated = await updateProposal(ctx, id, input);
      savedId = updated.id;
    } else {
      const created = await createProposal(ctx, input);
      savedId = created.id;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${savedId}`);
  redirect(`/proposals/${savedId}`);
}
