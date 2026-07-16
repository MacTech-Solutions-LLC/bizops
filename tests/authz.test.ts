import assert from "node:assert/strict";
import { test } from "node:test";
import type { HubAccessSnapshot } from "@mactech/hub-client";
import {
  govConContextFromSnapshot,
  hasGovConPermission,
  makeGovConContext,
  requireGovConPermission,
  resolveGrantedPermissions,
} from "@/lib/authz";
import { AuthzError } from "@/lib/errors";
import {
  ALL_GOVCON_PERMISSIONS,
  GOVCON_PERMISSIONS,
  permissionsForRole,
} from "@/lib/permissions/govcon";

function snapshot(overrides: Partial<HubAccessSnapshot> = {}): HubAccessSnapshot {
  return {
    allowed: true,
    user: {
      id: "hub_user_admin",
      clerkUserId: "user_clerk_admin",
      email: "admin@example.com",
      displayName: "Admin",
      status: "active",
    },
    tenant: { organizationId: "org_acme" },
    membership: {
      userId: "hub_user_admin",
      organizationId: "org_acme",
      role: "customer_admin",
      status: "active",
    },
    entitlements: [{ appKey: "bizops", organizationId: "org_acme", status: "active" }],
    contractAccess: [],
    resolvedAt: new Date().toISOString(),
    ...overrides,
  } as HubAccessSnapshot;
}

test("customer_admin resolves to all permissions", () => {
  const ctx = govConContextFromSnapshot(snapshot());
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ADMIN), true);
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT), true);
});

test("member role is a contributor, not an approver", () => {
  const ctx = govConContextFromSnapshot(
    snapshot({
      membership: { userId: "u", organizationId: "org_acme", role: "member", status: "active" },
    }),
  );
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CREATE), true);
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EDIT), true);
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_BID_DECISION_APPROVE), false);
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_FINANCIAL_EDIT), false);
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT), false);
});

test("viewer role sees but cannot create", () => {
  const ctx = govConContextFromSnapshot(
    snapshot({
      membership: { userId: "u", organizationId: "org_acme", role: "govcon_viewer", status: "active" },
    }),
  );
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW), true);
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CREATE), false);
});

test("Hub-resolved entitlement features are honoured (live mode)", () => {
  const ctx = govConContextFromSnapshot(
    snapshot({
      membership: { userId: "u", organizationId: "org_acme", role: "unknown_role", status: "active" },
      entitlements: [
        {
          appKey: "bizops",
          organizationId: "org_acme",
          status: "active",
          features: [GOVCON_PERMISSIONS.GOVCON_VIEW, GOVCON_PERMISSIONS.GOVCON_EXPORT],
        },
      ],
    }),
  );
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT), true);
  assert.equal(hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ADMIN), false);
});

test("requireGovConPermission throws AuthzError (403) when missing", () => {
  const ctx = makeGovConContext({
    tenantOrgId: "org_acme",
    actorHubUserId: "u",
    permissions: new Set([GOVCON_PERMISSIONS.GOVCON_VIEW]),
  });
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW); // no throw
  assert.throws(
    () => requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CREATE),
    (err: unknown) => err instanceof AuthzError && err.status === 403,
  );
});

test("govConContextFromSnapshot rejects a non-allowed snapshot", () => {
  assert.throws(
    () => govConContextFromSnapshot(snapshot({ allowed: false })),
    (err: unknown) => err instanceof AuthzError,
  );
});

test("unknown role grants nothing via the role map", () => {
  assert.deepEqual(permissionsForRole("does-not-exist"), []);
  assert.deepEqual(permissionsForRole(null), []);
});

/**
 * The role map is pinned to the Suite's ACTUAL vocabulary, not a plausible one.
 *
 * These two strings are the entire output of the Suite's Clerk sync
 * (`lib/clerk-role-map.ts` there): "org:admin" → customer_admin, everyone else
 * → read_only_user. read_only_user was missing from the map, so it resolved to
 * [] and every non-admin member of an org was locked out of the whole app —
 * they could not even onboard their own profile.
 *
 * The tests above cover "member"/"viewer", which the Suite never emits. That is
 * why this went unnoticed: the map was only ever checked against itself. If a
 * role here starts failing, the Suite's vocabulary moved — fix the map, don't
 * delete the test.
 */
test("read_only_user — what every non-admin member holds — can onboard itself", () => {
  const perms = permissionsForRole("read_only_user");
  assert.ok(perms.length > 0, "read_only_user must not resolve to zero permissions");
  assert.ok(perms.includes(GOVCON_PERMISSIONS.GOVCON_PROFILE_SELF_MANAGE));
  assert.ok(perms.includes(GOVCON_PERMISSIONS.GOVCON_VIEW));
  // Least-privilege baseline: read-only, and no reach into anyone else's profile.
  assert.ok(!perms.includes(GOVCON_PERMISSIONS.GOVCON_EDIT));
  assert.ok(!perms.includes(GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE));
});

test("customer_owner and customer_admin are both full-access", () => {
  assert.deepEqual(permissionsForRole("customer_owner"), ALL_GOVCON_PERMISSIONS);
  assert.deepEqual(permissionsForRole("customer_admin"), ALL_GOVCON_PERMISSIONS);
});

test("every role the Suite can emit grants self-profile management", () => {
  // Onboarding must never hard-block on an elevated grant. "member" is included
  // because hub-client's adapter falls back to it when a user has no membership
  // row (`live.memberRoles?.[0] ?? "member"`).
  for (const role of ["customer_owner", "customer_admin", "read_only_user", "member"]) {
    assert.ok(
      permissionsForRole(role).includes(GOVCON_PERMISSIONS.GOVCON_PROFILE_SELF_MANAGE),
      `${role} cannot manage its own profile`,
    );
  }
});
