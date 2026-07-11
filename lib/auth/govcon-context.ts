import "server-only";
import { getAppAuthContext, requireAppAuthContext } from "@/lib/auth/context";
import { govConContextFromSnapshot, type GovConContext } from "@/lib/authz";

/**
 * Resolve the GovCon authorization context for the current request. Redirects
 * (via `requireAppAuthContext`) if the user is not signed in, lacks the bizops
 * entitlement, or has no bound tenant. Use in Server Components / route handlers.
 */
export async function requireGovConContext(): Promise<GovConContext> {
  const appAuth = await requireAppAuthContext();
  return govConContextFromSnapshot(appAuth.hub, {
    clerkUserId: appAuth.clerkUserId,
    clerkOrgId: appAuth.clerkOrgId,
  });
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
