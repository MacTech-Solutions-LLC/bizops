"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { createDocument } from "@/lib/services/documents";
import { isAppError, ValidationError } from "@/lib/errors";

export interface DocFormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

export async function createDocumentAction(_prev: DocFormState, formData: FormData): Promise<DocFormState> {
  const ctx = await requireGovConContext();
  const input: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (!k.startsWith("$")) input[k] = v;
  try {
    await createDocument(ctx, input);
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: "Please correct the fields.", issues: err.issues };
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath("/documents");
  return { ok: true };
}
