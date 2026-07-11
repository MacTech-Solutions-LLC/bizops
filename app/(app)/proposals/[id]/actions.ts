"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import {
  addFinding,
  assignRequirement,
  changeVolumeStatus,
  closeReview,
  createRequirement,
  createVolume,
  resolveFinding,
  scheduleReview,
  updateRequirement,
  updateVolume,
} from "@/lib/services/proposals";
import { isAppError, ValidationError } from "@/lib/errors";
import { type FormState } from "@/app/(app)/proposals/actions";
import { formDataToObject } from "@/lib/forms";

export type { FormState };

function fail(err: unknown): FormState {
  if (err instanceof ValidationError) {
    return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
  }
  if (isAppError(err)) return { ok: false, error: err.userMessage };
  throw err;
}

function revalidate(proposalId: string): void {
  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/proposals");
}

// --- Volumes ----------------------------------------------------------------

/** Create or update a volume — `volumeId` present ⇒ update. Form-driven. */
export async function saveVolumeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const proposalId = String(formData.get("proposalId") ?? "");
  const volumeId = formData.get("volumeId");
  const input = formDataToObject(formData);
  delete input.proposalId;
  delete input.volumeId;

  try {
    if (typeof volumeId === "string" && volumeId.length > 0) {
      await updateVolume(ctx, volumeId, input);
    } else {
      await createVolume(ctx, proposalId, input);
    }
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}

/** Drag-drop status change from the workflow board. */
export async function changeVolumeStatusAction(
  volumeId: string,
  status: string,
  proposalId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await changeVolumeStatus(ctx, volumeId, { status });
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}

// --- Requirements -----------------------------------------------------------

/** Create or update a requirement — `requirementId` present ⇒ update. */
export async function saveRequirementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const proposalId = String(formData.get("proposalId") ?? "");
  const requirementId = formData.get("requirementId");
  const input = formDataToObject(formData);
  delete input.proposalId;
  delete input.requirementId;

  try {
    if (typeof requirementId === "string" && requirementId.length > 0) {
      await updateRequirement(ctx, requirementId, input);
    } else {
      await createRequirement(ctx, proposalId, input);
    }
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}

/** Assign a requirement's owner / volume / status from the compliance matrix. */
export async function assignRequirementAction(
  requirementId: string,
  input: { ownerId?: string; volumeId?: string; status?: string },
  proposalId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await assignRequirement(ctx, requirementId, input);
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}

// --- Reviews ----------------------------------------------------------------

/** Schedule a color-team review. Form-driven. */
export async function scheduleReviewAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const proposalId = String(formData.get("proposalId") ?? "");
  const input = formDataToObject(formData);
  delete input.proposalId;

  try {
    await scheduleReview(ctx, proposalId, input);
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}

export async function closeReviewAction(
  reviewId: string,
  proposalId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await closeReview(ctx, reviewId);
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}

// --- Findings (reviewer permission) -----------------------------------------

/** Add a finding to a review. Form-driven. */
export async function addFindingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const proposalId = String(formData.get("proposalId") ?? "");
  const reviewId = String(formData.get("reviewId") ?? "");
  const input = formDataToObject(formData);
  delete input.proposalId;
  delete input.reviewId;

  try {
    await addFinding(ctx, reviewId, input);
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}

export async function resolveFindingAction(
  findingId: string,
  status: string,
  proposalId: string,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await resolveFinding(ctx, findingId, { status });
  } catch (err) {
    return fail(err);
  }
  revalidate(proposalId);
  return { ok: true };
}
