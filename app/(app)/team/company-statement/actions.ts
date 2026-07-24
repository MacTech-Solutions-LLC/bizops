"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { isAppError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  generateCompanyStatement,
  saveCompanyStatement,
  type CompanyStatementDraftResult,
} from "@/lib/services/company-statement";

export interface FormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

export interface CompanyDraftState extends FormState {
  draft?: CompanyStatementDraftResult;
}

/**
 * Draft the org-wide statement from every published profile and confirmed
 * member statement. Returns the draft for manager review and persists NOTHING
 * — same never-guess contract as the member statement flow.
 */
export async function generateCompanyStatementAction(
  _prev: CompanyDraftState,
  _formData: FormData,
): Promise<CompanyDraftState> {
  const ctx = await requireGovConContext();
  try {
    const draft = await generateCompanyStatement(ctx);
    logger.info("company_statement_drafted", {
      actorHubUserId: ctx.actorHubUserId,
      aiStatus: draft.meta.aiStatus,
      contributors: draft.meta.contributorCount,
    });
    return { ok: true, draft };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    logger.exception("company_statement_generate_failed", err, {
      actorHubUserId: ctx.actorHubUserId,
    });
    return { ok: false, error: "We couldn't draft the company statement. Please try again." };
  }
}

/** Persist the company statement the manager reviewed and confirmed. */
export async function saveCompanyStatementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { ok: false, error: "Nothing to save. Please regenerate and try again." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Nothing to save. Please regenerate and try again." };
  }

  try {
    await saveCompanyStatement(ctx, payload);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "We couldn't save these details:", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/team/company-statement");
  revalidatePath("/team");
  return { ok: true };
}
