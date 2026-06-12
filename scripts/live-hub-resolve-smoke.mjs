import { createHubAuthorityClient } from "@mactech/hub-client";

const APP_KEY = process.env.MACTECH_APP_KEY ?? "bizops";
const PILOT_CLERK_USER_ID = "user_3DsUKUnHXxKdMCGphSlyoMljzwO";
const PILOT_CLERK_ORG_ID = "org_3EP8HTLXTm9tfUo3cV36kIGXjwQ";

function getClient() {
  const mode = process.env.HUB_AUTHORITY_MODE === "live" ? "live" : "mock";
  if (mode !== "live") throw new Error(`expected live mode, got ${mode}`);
  const serviceToken = process.env.MACTECH_HUB_SERVICE_TOKEN;
  if (!serviceToken) throw new Error("MACTECH_HUB_SERVICE_TOKEN missing");
  return createHubAuthorityClient({
    mode: "live",
    live: {
      hubBaseUrl:
        process.env.MACTECH_HUB_URL ?? "https://www.suite.mactechsolutionsllc.com",
      sourceAppKey: APP_KEY,
      serviceToken,
    },
  });
}

async function resolve(clerkUserId, clerkOrgId) {
  const hub = getClient();
  return hub.resolveAppAccess({
    appKey: APP_KEY,
    clerkUserId,
    clerkOrgId,
    mode: "user_session",
  });
}

const allow = await resolve(PILOT_CLERK_USER_ID, PILOT_CLERK_ORG_ID);
const denyWrongOrg = await resolve(
  PILOT_CLERK_USER_ID,
  "org_00000000000000000000000000",
);
const denyFakeUser = await resolve(
  "user_00000000000000000000000000",
  PILOT_CLERK_ORG_ID,
);

const result = {
  hubMode: "live",
  allow: {
    allowed: allow.allowed,
    userId: allow.user?.id || null,
    orgId: allow.tenant?.organizationId || null,
    reason: allow.reason ?? null,
    pass:
      allow.allowed &&
      Boolean(allow.user?.id) &&
      Boolean(allow.tenant?.organizationId),
  },
  denyWrongOrg: {
    allowed: denyWrongOrg.allowed,
    reason: denyWrongOrg.reason ?? null,
    pass: !denyWrongOrg.allowed,
  },
  denyFakeUser: {
    allowed: denyFakeUser.allowed,
    reason: denyFakeUser.reason ?? null,
    pass: !denyFakeUser.allowed,
  },
};

console.log(JSON.stringify(result, null, 2));
if (!result.allow.pass || !result.denyWrongOrg.pass || !result.denyFakeUser.pass) {
  process.exit(1);
}
