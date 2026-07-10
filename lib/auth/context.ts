import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { HubAccessSnapshot } from "@mactech/hub-client";
import { orgContextFromHubSnapshot } from "@/lib/auth/org-context-server";
import { resolveAppHubAccess } from "@/lib/hub/client";

export type AppAuthContext = {
  clerkUserId: string;
  clerkOrgId: string | null;
  hub: HubAccessSnapshot;
};

export async function requireAppAuthContext(): Promise<AppAuthContext> {
  const { userId, orgId } = auth();
  if (!userId) redirect("/sign-in");

  const hub = await resolveAppHubAccess(userId, orgId);
  const orgContext = orgContextFromHubSnapshot(hub, orgId);

  if (!hub.allowed || !hub.tenant?.organizationId) {
    if (orgContext.showChooseOrganization) redirect("/choose-organization");
    redirect("/access-denied");
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
  const hub = await resolveAppHubAccess(userId, orgId);
  if (!hub.allowed || !hub.tenant?.organizationId) return null;
  return { clerkUserId: userId, clerkOrgId: orgId ?? hub.tenant?.clerkOrgId ?? null, hub };
}
