import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { HubAccessSnapshot } from "@mactech/hub-client";
import { resolveAppHubAccess } from "@/lib/hub/client";

export type AppAuthContext = {
  clerkUserId: string;
  clerkOrgId: string | null;
  hub: HubAccessSnapshot;
};

export async function requireAppAuthContext(): Promise<AppAuthContext> {
  const { userId, orgId } = auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/choose-organization");
  const hub = await resolveAppHubAccess(userId, orgId);
  if (!hub.allowed || !hub.tenant?.organizationId) redirect("/access-denied");
  return { clerkUserId: userId, clerkOrgId: orgId ?? null, hub };
}

export async function getAppAuthContext(): Promise<AppAuthContext | null> {
  const { userId, orgId } = auth();
  if (!userId) return null;
  const hub = await resolveAppHubAccess(userId, orgId);
  if (!hub.allowed || !hub.tenant?.organizationId) return null;
  return { clerkUserId: userId, clerkOrgId: orgId ?? null, hub };
}
