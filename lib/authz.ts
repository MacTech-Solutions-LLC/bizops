/**
 * GovCon authorization context + the single server-side permission gate.
 *
 * Every service query/mutation receives a `GovConContext` and passes through
 * `requireGovConPermission`. The context carries the resolved tenant
 * (`hubOrganizationId`), the actor's Hub user id (for audit + createdBy/updatedBy),
 * and the set of granted permissions. UI hiding is cosmetic only; this is the
 * security boundary.
 */

import type { HubAccessSnapshot } from "@mactech/hub-client";
import { AuthzError, UnauthenticatedError } from "@/lib/errors";
import {
  ALL_GOVCON_PERMISSIONS,
  isGovConPermission,
  permissionsForRole,
  type GovConPermission,
} from "@/lib/permissions/govcon";
import { APP_KEY } from "@/lib/hub/client";

export interface GovConContext {
  /** Tenant scope — the Hub organization id. Every query filters on this. */
  tenantOrgId: string;
  /** Actor's Hub user id (opaque). Used for audit, createdBy/updatedBy. */
  actorHubUserId: string;
  /** Clerk user id, retained for audit correlation. */
  actorClerkUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  /** Membership role(s) for this org. */
  roles: string[];
  /** Resolved granted permissions. */
  permissions: ReadonlySet<GovConPermission>;
  clerkOrgId?: string | null;
}

/**
 * Resolve the effective permission set from a Hub access snapshot: the union of
 * (a) permissions the Hub explicitly resolved into the bizops entitlement's
 * `features`, and (b) the defensible role→permission fallback. In live mode the
 * Hub is authoritative; in mock mode the role fallback drives access.
 */
export function resolveGrantedPermissions(
  snapshot: HubAccessSnapshot,
): Set<GovConPermission> {
  const granted = new Set<GovConPermission>();

  const entitlement = snapshot.entitlements?.find(
    (e) => e.appKey === APP_KEY && e.organizationId === snapshot.tenant?.organizationId,
  );
  for (const feature of entitlement?.features ?? []) {
    if (isGovConPermission(feature)) granted.add(feature);
  }

  const roles = collectRoles(snapshot);
  for (const role of roles) {
    for (const perm of permissionsForRole(role)) granted.add(perm);
  }

  return granted;
}

function collectRoles(snapshot: HubAccessSnapshot): string[] {
  const roles = new Set<string>();
  if (snapshot.membership?.role) roles.add(snapshot.membership.role);
  return [...roles];
}

/**
 * Build a `GovConContext` from a resolved Hub snapshot. Throws if the snapshot
 * is not access-granting or lacks a tenant — callers in the web layer resolve
 * the snapshot via `requireAppAuthContext()` which already redirects, so this is
 * a defensive final check.
 */
export function govConContextFromSnapshot(
  snapshot: HubAccessSnapshot,
  clerkContext?: { clerkUserId?: string | null; clerkOrgId?: string | null },
): GovConContext {
  if (!snapshot.allowed || !snapshot.tenant?.organizationId) {
    throw new AuthzError("Hub access not granted for bizops", {
      context: { reason: snapshot.reason },
    });
  }
  const actorHubUserId = snapshot.user?.id;
  if (!actorHubUserId) {
    throw new UnauthenticatedError("Hub snapshot missing user identity");
  }
  return {
    tenantOrgId: snapshot.tenant.organizationId,
    actorHubUserId,
    actorClerkUserId: clerkContext?.clerkUserId ?? snapshot.user?.clerkUserId ?? null,
    actorEmail: snapshot.user?.email ?? null,
    actorName: snapshot.user?.displayName ?? null,
    roles: collectRoles(snapshot),
    permissions: resolveGrantedPermissions(snapshot),
    clerkOrgId: clerkContext?.clerkOrgId ?? snapshot.tenant?.clerkOrgId ?? null,
  };
}

export function hasGovConPermission(
  ctx: GovConContext,
  permission: GovConPermission,
): boolean {
  return ctx.permissions.has(permission);
}

export function hasAnyGovConPermission(
  ctx: GovConContext,
  permissions: GovConPermission[],
): boolean {
  return permissions.some((p) => ctx.permissions.has(p));
}

/** The gate. Throws `AuthzError` (403) when the actor lacks the permission. */
export function requireGovConPermission(
  ctx: GovConContext,
  permission: GovConPermission,
): void {
  if (!ctx.permissions.has(permission)) {
    throw new AuthzError(`Missing permission ${permission}`, {
      context: {
        permission,
        actorHubUserId: ctx.actorHubUserId,
        tenantOrgId: ctx.tenantOrgId,
        roles: ctx.roles,
      },
    });
  }
}

/**
 * Test/seed helper — construct a context directly. Defaults to all permissions
 * so unit tests can focus on behaviour; pass `permissions` to test the gate.
 */
export function makeGovConContext(
  overrides: Partial<GovConContext> & { tenantOrgId: string; actorHubUserId: string },
): GovConContext {
  return {
    actorClerkUserId: null,
    actorEmail: null,
    actorName: null,
    roles: overrides.roles ?? ["govcon_admin"],
    permissions:
      overrides.permissions ?? new Set<GovConPermission>(ALL_GOVCON_PERMISSIONS),
    clerkOrgId: null,
    ...overrides,
  };
}
