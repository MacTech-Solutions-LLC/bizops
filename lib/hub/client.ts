import {
  createHubAuthorityClient,
  DEFAULT_MOCK_FIXTURES,
  type HubAccessSnapshot,
  type HubAuthorityClient,
  type MacTechAppKey,
} from "@mactech/hub-client";

/** Pre-tenant: bizops not yet in hub-client union on platform main — cast until R-2 registry. */
export const APP_KEY = (process.env.MACTECH_APP_KEY ?? "bizops") as MacTechAppKey;

let cachedClient: HubAuthorityClient | undefined;

export function getHubAuthorityClient(): HubAuthorityClient {
  if (cachedClient) return cachedClient;
  const mode = process.env.HUB_AUTHORITY_MODE === "live" ? "live" : "mock";
  if (mode === "mock") {
    cachedClient = createHubAuthorityClient({
      mode: "mock",
      mock: {
        fixtures: {
          ...DEFAULT_MOCK_FIXTURES,
          entitlements: [
            ...DEFAULT_MOCK_FIXTURES.entitlements,
            { appKey: APP_KEY, organizationId: "org_acme", status: "active" },
          ],
        },
      },
    });
    return cachedClient;
  }
  cachedClient = createHubAuthorityClient({
    mode: "live",
    live: {
      hubBaseUrl:
        process.env.MACTECH_HUB_URL ?? "https://www.suite.mactechsolutionsllc.com",
      sourceAppKey: APP_KEY,
      serviceToken: process.env.MACTECH_HUB_SERVICE_TOKEN,
    },
  });
  return cachedClient;
}

export async function resolveAppHubAccess(
  clerkUserId: string,
  clerkOrgId?: string | null,
): Promise<HubAccessSnapshot> {
  return getHubAuthorityClient().resolveAppAccess({
    appKey: APP_KEY,
    clerkUserId,
    clerkOrgId: clerkOrgId ?? undefined,
    mode: "user_session",
  });
}
