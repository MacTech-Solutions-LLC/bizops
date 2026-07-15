"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { isAppError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseResume, type ResumeProposal } from "@/lib/resume";
import {
  applyResumeProposal,
  publishProfile,
  updateProfile,
} from "@/lib/services/member-profile";

export interface FormState {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[]>;
}

export interface ParseState extends FormState {
  proposal?: ResumeProposal;
}

/**
 * Parse an uploaded resume into a reviewable proposal.
 *
 * The file is read into memory, parsed, and dropped. It is never written to
 * disk, never handed to a StorageAdapter, and never persisted — the only thing
 * that leaves this action is the structured proposal, and the only thing that
 * reaches the database is what the member later confirms via
 * `applyProposalAction`. If you are tempted to add an "attach original" feature
 * here, that is a product decision that reverses an explicit privacy promise
 * made in the UI — raise it, don't just wire it.
 */
export async function parseResumeAction(
  _prev: ParseState,
  formData: FormData,
): Promise<ParseState> {
  const ctx = await requireGovConContext();
  const file = formData.get("resume");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a resume file to upload." };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const proposal = await parseResume(bytes, file.type, file.name);

    logger.info("resume_parsed", {
      actorHubUserId: ctx.actorHubUserId,
      tenantOrgId: ctx.tenantOrgId,
      aiStatus: proposal.meta.aiStatus,
      // Filename only — the resume's contents are never logged.
      filename: proposal.meta.filename,
      skills: proposal.skills.length,
    });

    return { ok: true, proposal };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: err.userMessage, issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    logger.exception("resume_parse_action_failed", err, {
      actorHubUserId: ctx.actorHubUserId,
    });
    return { ok: false, error: "We couldn't process that file. Please try again." };
  }
}

/**
 * Persist the proposal the member reviewed and confirmed. The payload is the
 * edited state from the review UI, not the raw extraction — anything the member
 * deleted is simply not here, and therefore not saved.
 */
export async function applyProposalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { ok: false, error: "Nothing to save. Please re-upload your resume." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Nothing to save. Please re-upload your resume." };
  }

  try {
    await applyResumeProposal(ctx, ctx.actorHubUserId, payload);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: err.userMessage, issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  return { ok: true };
}

/** Save manual edits to the profile's scalar fields. */
export async function saveProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireGovConContext();
  const input: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    input[key] = value;
  }

  try {
    await updateProfile(ctx, ctx.actorHubUserId, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: "Please correct the highlighted fields.", issues: err.issues };
    }
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  return { ok: true };
}

/** Publish — makes the profile eligible for capability statements. */
export async function publishProfileAction(_prev: FormState): Promise<FormState> {
  const ctx = await requireGovConContext();
  try {
    await publishProfile(ctx, ctx.actorHubUserId);
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
  revalidatePath("/onboarding");
  revalidatePath("/profile");
  return { ok: true };
}
