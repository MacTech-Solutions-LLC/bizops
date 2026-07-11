"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { upsertCompanyProfile } from "@/lib/services/settings";
import { isAppError, ValidationError } from "@/lib/errors";

export interface SettingsFormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

export async function saveCompanyProfileAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const ctx = await requireGovConContext();
  const input: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (!k.startsWith("$")) input[k] = v;
  try {
    await upsertCompanyProfile(ctx, input);
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: "Please correct the fields.", issues: err.issues };
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath("/settings");
  return { ok: true };
}
