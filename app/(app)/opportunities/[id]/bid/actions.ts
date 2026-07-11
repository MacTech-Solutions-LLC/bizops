"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import {
  recordDecision,
  submitReview,
  upsertBidDecisionCriteria,
} from "@/lib/services/bid-decisions";
import { isAppError, ValidationError } from "@/lib/errors";
import type { BidCriterionInput } from "@/lib/validation/bid";

export interface FormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

function revalidateBid(opportunityId: string) {
  revalidatePath(`/opportunities/${opportunityId}/bid`);
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/active-bids");
  revalidatePath("/dashboard");
}

/** Save scorecard criteria (advisory weighted score is computed server-side). */
export async function saveCriteriaAction(
  opportunityId: string,
  criteria: BidCriterionInput[],
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await upsertBidDecisionCriteria(ctx, opportunityId, criteria);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the scorecard.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateBid(opportunityId);
  return { ok: true };
}

export async function submitReviewAction(
  opportunityId: string,
  input: { reviewerId: string; vote: string; score?: string; comments?: string; approved?: boolean },
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await submitReview(ctx, opportunityId, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the review.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateBid(opportunityId);
  return { ok: true };
}

/**
 * Record the FINAL decision. The human passes the outcome explicitly — it is
 * never derived from the advisory score.
 */
export async function recordDecisionAction(
  opportunityId: string,
  input: { outcome: string; rationale?: string; requiredApprovers?: string },
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await recordDecision(ctx, opportunityId, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please choose an outcome.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidateBid(opportunityId);
  return { ok: true };
}
