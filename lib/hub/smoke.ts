import { DEFAULT_MOCK_FIXTURES } from "@mactech/hub-client";
import { APP_KEY, getHubAuthorityClient } from "./client";

const MOCK_CLERK_USER_ID = DEFAULT_MOCK_FIXTURES.users[0]!.clerkUserId;
const MOCK_CLERK_ORG_ID = DEFAULT_MOCK_FIXTURES.orgs[0]!.clerkOrgId ?? undefined;

/** Verifies mock Hub wiring via createHubAuthorityClient + resolveAppAccess (no live token). */
export async function runMockHubSmoke(): Promise<{ appKey: string; allowed: true }> {
  const snapshot = await getHubAuthorityClient().resolveAppAccess({
    appKey: APP_KEY,
    clerkUserId: MOCK_CLERK_USER_ID,
    clerkOrgId: MOCK_CLERK_ORG_ID,
    mode: "user_session",
  });
  if (!snapshot.allowed) {
    throw new Error(snapshot.reason ?? "hub_access_denied");
  }
  return { appKey: APP_KEY, allowed: true };
}
