"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { markAllRead } from "@/lib/services/notifications";
import { isAppError } from "@/lib/errors";

export interface ActionResult {
  ok: boolean;
  error?: string;
  count?: number;
}

/** Mark all of the current actor's unread notifications as read. */
export async function markAllReadAction(): Promise<ActionResult> {
  const ctx = await requireGovConContext();
  try {
    const count = await markAllRead(ctx);
    revalidatePath("/activity");
    return { ok: true, count };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    throw err;
  }
}
