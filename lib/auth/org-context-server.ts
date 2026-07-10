import { auth } from "@clerk/nextjs/server";
import type { HubAccessSnapshot } from "@mactech/hub-client";
import {
  deriveSuiteOrgContextUx,
  type HubSessionContext,
  type SuiteOrgContextUx,
} from "@/lib/auth/org-context-policy";

export function orgContextFromHubSnapshot(
  hub: HubAccessSnapshot,
  clerkOrgId?: string | null,
): SuiteOrgContextUx {
  const extended = hub as HubAccessSnapshot & { orgContext?: SuiteOrgContextUx };
  if (extended.orgContext) return extended.orgContext;

  const session: HubSessionContext = {
    isInternalMacTechUser: false,
    boundClerkOrgId: hub.tenant?.clerkOrgId ?? clerkOrgId ?? null,
    activeOrganizationCount: hub.tenant?.organizationId ? 1 : 0,
  };
  return deriveSuiteOrgContextUx(session);
}

export async function resolveOrgContextForSession(
  resolveHub: (clerkUserId: string, clerkOrgId?: string | null) => Promise<HubAccessSnapshot>,
): Promise<{ hub: HubAccessSnapshot; orgContext: SuiteOrgContextUx } | null> {
  const { userId, orgId } = await auth();
  if (!userId) return null;
  const hub = await resolveHub(userId, orgId);
  return { hub, orgContext: orgContextFromHubSnapshot(hub, orgId) };
}
