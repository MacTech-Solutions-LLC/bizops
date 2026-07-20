/**
 * Inbound service-token auth for sibling MacTech apps.
 *
 * bizops has plenty of *outbound* service credentials (Hub audit, profile
 * push/read) but until the Directory API had no inbound machine-to-machine
 * surface. This module is that verifier. Design mirrors the profile_read
 * pattern (ADR-0003): one dedicated, separately-rotated token per capability so
 * a leaked credential's blast radius stays one capability wide.
 *
 * Contract (all required):
 *   authorization: Bearer <MACTECH_DIRECTORY_SERVICE_TOKEN>
 *   x-mactech-service-app: <caller app key, e.g. "taplink">
 *   organizationId: Hub org id, as a query param (GET) or body field (POST/PATCH)
 *
 * The token is suite-internal: any holder may act on any tenant's directory,
 * scoped to exactly the directory permissions below. Callers are first-party
 * apps that already know their Hub org id.
 */

import { timingSafeEqual } from "node:crypto";
import type { GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS, type GovConPermission } from "@/lib/permissions/govcon";
import { UnauthenticatedError, OperationalError, ValidationError } from "@/lib/errors";

const SERVICE_APP_HEADER = "x-mactech-service-app";

/** Permissions a directory service caller holds — nothing else. */
const DIRECTORY_SERVICE_PERMISSIONS: GovConPermission[] = [
  GOVCON_PERMISSIONS.GOVCON_VIEW,
  GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE,
];

function constantTimeMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // Length leak is fine; content comparison must be constant-time.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify the request's service credentials. Throws `UnauthenticatedError`
 * (→ 401) on a missing/bad token and `OperationalError` when the endpoint is
 * not configured (no token in the environment — never treat that as open).
 */
export function requireDirectoryServiceCaller(request: Request): { sourceApp: string } {
  const expected = process.env.MACTECH_DIRECTORY_SERVICE_TOKEN;
  if (!expected) {
    throw new OperationalError("Directory service API is not configured");
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!presented || !constantTimeMatch(presented, expected)) {
    throw new UnauthenticatedError("Invalid service token");
  }

  const sourceApp = request.headers.get(SERVICE_APP_HEADER)?.trim().toLowerCase();
  if (!sourceApp) {
    throw new UnauthenticatedError(`Missing ${SERVICE_APP_HEADER} header`);
  }
  return { sourceApp };
}

/**
 * Build the GovCon context a verified service caller operates under: the
 * caller-supplied tenant, a synthetic `service:<app>` actor (recorded in
 * createdBy/updatedBy and the audit trail), and only directory permissions.
 */
export function directoryServiceContext(sourceApp: string, organizationId: unknown): GovConContext {
  if (typeof organizationId !== "string" || organizationId.trim().length === 0) {
    throw new ValidationError("organizationId is required", {
      issues: { organizationId: ["organizationId is required"] },
    });
  }
  return {
    tenantOrgId: organizationId.trim(),
    actorHubUserId: `service:${sourceApp}`,
    actorClerkUserId: null,
    actorEmail: null,
    actorName: null,
    roles: [],
    permissions: new Set(DIRECTORY_SERVICE_PERMISSIONS),
    clerkOrgId: null,
    sourceApp,
  };
}
