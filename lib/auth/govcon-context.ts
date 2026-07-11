import "server-only";
import { redirect } from "next/navigation";
import { getAppAuthContext, isNextControlFlowError, requireAppAuthContext } from "@/lib/auth/context";
import { govConContextFromSnapshot, type GovConContext } from "@/lib/authz";
import { logger } from "@/lib/logger";

/**
 * Resolve the GovCon authorization context for the current request. Redirects
 * (via `requireAppAuthContext`) if the user is not signed in, lacks the bizops
 * entitlement, or has no bound tenant. If the snapshot is access-granting but
 * malformed, it fails safe to /access-denied rather than throwing an unhandled
 * Server Component exception.
 */
export async function requireGovConContext(): Promise<GovConContext> {
  const appAuth = await requireAppAuthContext();
  try {
    return govConContextFromSnapshot(appAuth.hub, {
      clerkUserId: appAuth.clerkUserId,
      clerkOrgId: appAuth.clerkOrgId,
    });
  } catch (err) {
    if (isNextControlFlowError(err)) throw err;
    logger.exception("govcon_context_build_failed", err, {
      clerkUserId: appAuth.clerkUserId,
    });
    redirect("/access-denied");
  }
}

/** Non-redirecting variant — returns null when access is not granted. */
export async function getGovConContext(): Promise<GovConContext | null> {
  const appAuth = await getAppAuthContext();
  if (!appAuth) return null;
  try {
    return govConContextFromSnapshot(appAuth.hub, {
      clerkUserId: appAuth.clerkUserId,
      clerkOrgId: appAuth.clerkOrgId,
    });
  } catch {
    return null;
  }
}
