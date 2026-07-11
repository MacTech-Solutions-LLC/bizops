import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { HubAccessSnapshot } from "@mactech/hub-client";
import { orgContextFromHubSnapshot } from "@/lib/auth/org-context-server";
import { resolveAppHubAccess } from "@/lib/hub/client";
import { logger } from "@/lib/logger";

export type AppAuthContext = {
  clerkUserId: string;
  clerkOrgId: string | null;
  hub: HubAccessSnapshot;
};

/**
 * True for Next's internal control-flow throws (`redirect()` / `notFound()`),
 * which must be re-thrown so navigation works — never swallowed by a catch.
 */
export function isNextControlFlowError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/**
 * Resolve the Hub access snapshot, failing gracefully. A Hub outage or
 * misconfiguration (e.g. the authority endpoint down during a suite redeploy)
 * must not white-screen the app with an unhandled Server Component exception —
 * it redirects to a safe page. Returns null on failure for the non-throwing
 * caller path.
 */
async function safeResolveHub(
  userId: string,
  orgId: string | null,
): Promise<HubAccessSnapshot | null> {
  try {
    return await resolveAppHubAccess(userId, orgId);
  } catch (err) {
    logger.exception("hub_resolve_failed", err, { userId, orgId });
    return null;
  }
}

export async function requireAppAuthContext(): Promise<AppAuthContext> {
  const { userId, orgId } = auth();
  if (!userId) redirect("/sign-in");

  const hub = await safeResolveHub(userId, orgId ?? null);
  // Hub unreachable/errored → don't crash; send to a safe page.
  if (!hub) redirect("/access-denied?reason=hub_unavailable");

  const orgContext = orgContextFromHubSnapshot(hub, orgId);

  if (!hub.allowed || !hub.tenant?.organizationId) {
    if (orgContext.showChooseOrganization) redirect("/choose-organization");
    // Surface the Hub's deny reason so users/admins can self-diagnose
    // (e.g. app_inactive vs entitlement_missing vs membership_missing).
    const reason = hub.reason ? `?reason=${encodeURIComponent(hub.reason)}` : "";
    redirect(`/access-denied${reason}`);
  }

  if (!orgId && orgContext.showChooseOrganization) {
    redirect("/choose-organization");
  }

  return {
    clerkUserId: userId,
    clerkOrgId: orgId ?? hub.tenant?.clerkOrgId ?? null,
    hub,
  };
}

export async function getAppAuthContext(): Promise<AppAuthContext | null> {
  const { userId, orgId } = auth();
  if (!userId) return null;
  const hub = await safeResolveHub(userId, orgId ?? null);
  if (!hub || !hub.allowed || !hub.tenant?.organizationId) return null;
  return { clerkUserId: userId, clerkOrgId: orgId ?? hub.tenant?.clerkOrgId ?? null, hub };
}
