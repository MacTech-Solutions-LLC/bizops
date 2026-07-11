"use server";

import { revalidatePath } from "next/cache";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { archiveOpportunity } from "@/lib/services/opportunities";
import { isAppError } from "@/lib/errors";

/** Archive multiple opportunities. Each call is permission- and tenant-checked
 * inside the service; failures are collected, not silently swallowed. */
export async function bulkArchiveAction(ids: string[]): Promise<{ archived: number; failed: number }> {
  const ctx = await requireGovConContext();
  let archived = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await archiveOpportunity(ctx, id);
      archived += 1;
    } catch (err) {
      failed += 1;
      if (!isAppError(err)) throw err;
    }
  }
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  return { archived, failed };
}
