/**
 * GovCon business permissions.
 *
 * Mirrors the MacTech Suite convention (`lib/permissions.ts` in
 * mactech-suite-platform): permissions are namespaced colon-triple strings and
 * nothing that grants access ever compares against a magic literal — it
 * references one of these constants. GovCon permissions live under the
 * `org:govcon:*` namespace so the Hub can resolve them per membership.
 */

export const GOVCON_PERMISSIONS = {
  GOVCON_VIEW: "org:govcon:view",
  GOVCON_CREATE: "org:govcon:create",
  GOVCON_EDIT: "org:govcon:edit",
  GOVCON_ARCHIVE: "org:govcon:archive",
  GOVCON_ADMIN: "org:govcon:admin",
  GOVCON_PIPELINE_VIEW: "org:govcon:pipeline:view",
  GOVCON_FINANCIAL_VIEW: "org:govcon:financial:view",
  GOVCON_FINANCIAL_EDIT: "org:govcon:financial:edit",
  GOVCON_CAPTURE_MANAGE: "org:govcon:capture:manage",
  GOVCON_BID_DECISION_REVIEW: "org:govcon:bid:review",
  GOVCON_BID_DECISION_APPROVE: "org:govcon:bid:approve",
  GOVCON_PROPOSAL_MANAGE: "org:govcon:proposal:manage",
  GOVCON_PROPOSAL_REVIEW: "org:govcon:proposal:review",
  GOVCON_SBIR_MANAGE: "org:govcon:sbir:manage",
  GOVCON_PARTNERS_MANAGE: "org:govcon:partners:manage",
  GOVCON_CONTACTS_MANAGE: "org:govcon:contacts:manage",
  GOVCON_TASKS_MANAGE: "org:govcon:tasks:manage",
  GOVCON_DOCUMENTS_MANAGE: "org:govcon:documents:manage",
  GOVCON_READINESS_MANAGE: "org:govcon:readiness:manage",
  /** Edit your own capability profile. Held by every role — a member must be
   * able to complete their own onboarding without an elevated grant. */
  GOVCON_PROFILE_SELF_MANAGE: "org:govcon:profile:self",
  /** Read/administer *other* members' profiles (manager rollups, org-wide
   * capability statements). Deliberately separate from the self grant. */
  GOVCON_PROFILE_MANAGE: "org:govcon:profile:manage",
  GOVCON_REPORTS_VIEW: "org:govcon:reports:view",
  GOVCON_EXPORT: "org:govcon:export",
} as const;

export type GovConPermissionKey = keyof typeof GOVCON_PERMISSIONS;
export type GovConPermission =
  (typeof GOVCON_PERMISSIONS)[GovConPermissionKey];

export const ALL_GOVCON_PERMISSIONS: GovConPermission[] = Object.values(
  GOVCON_PERMISSIONS,
);

/** Read-only permissions safe for any member who can see the workspace. */
const VIEWER_PERMISSIONS: GovConPermission[] = [
  GOVCON_PERMISSIONS.GOVCON_VIEW,
  GOVCON_PERMISSIONS.GOVCON_PIPELINE_VIEW,
  GOVCON_PERMISSIONS.GOVCON_REPORTS_VIEW,
  // Self-service onboarding: every role edits its own profile, including guest.
  GOVCON_PERMISSIONS.GOVCON_PROFILE_SELF_MANAGE,
];

/** Contributors can create/edit records and drive collaboration, but not
 * approve bid decisions, edit financials, archive, or export. */
const CONTRIBUTOR_PERMISSIONS: GovConPermission[] = [
  ...VIEWER_PERMISSIONS,
  GOVCON_PERMISSIONS.GOVCON_CREATE,
  GOVCON_PERMISSIONS.GOVCON_EDIT,
  GOVCON_PERMISSIONS.GOVCON_FINANCIAL_VIEW,
  GOVCON_PERMISSIONS.GOVCON_CAPTURE_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_PROPOSAL_REVIEW,
  GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_TASKS_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_DOCUMENTS_MANAGE,
];

/** Managers can do everything a contributor can plus financials, bid decision
 * review/approval, proposal + partner + readiness management, archive, export. */
const MANAGER_PERMISSIONS: GovConPermission[] = [
  ...CONTRIBUTOR_PERMISSIONS,
  GOVCON_PERMISSIONS.GOVCON_ARCHIVE,
  GOVCON_PERMISSIONS.GOVCON_FINANCIAL_EDIT,
  GOVCON_PERMISSIONS.GOVCON_BID_DECISION_REVIEW,
  GOVCON_PERMISSIONS.GOVCON_BID_DECISION_APPROVE,
  GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_READINESS_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE,
  GOVCON_PERMISSIONS.GOVCON_EXPORT,
];

/**
 * Role → permission mapping. Keys are lower-cased role names as the Hub sends
 * them; an unrecognised role grants nothing.
 *
 * This is not a fallback in practice — it is the *only* thing that grants
 * access. `resolveGrantedPermissions` also unions in the Hub's resolved
 * permissions, but the Suite defines no `org:govcon:*` permissions at all, so
 * that branch contributes nothing for anybody.
 *
 * Which makes the keys load-bearing, and they must match the Suite's real role
 * vocabulary (`lib/permissions.ts` there, written to `OrgUserAccess.role` — a
 * free-form String, not an enum). The Suite's Clerk sync emits exactly two:
 *
 *   Clerk "org:admin" → "customer_admin"
 *   everyone else     → "read_only_user"
 *
 * `read_only_user` was missing here, so every non-admin member resolved to zero
 * permissions and could not use the app at all — including onboarding their own
 * profile.
 *
 * `member` is not a Suite role but is still load-bearing: hub-client's adapter
 * falls back to it (`live.memberRoles?.[0] ?? "member"`) when a user has no
 * membership row, and the mock fixtures use it. Don't remove it.
 */
export const GOVCON_ROLE_PERMISSIONS: Record<string, GovConPermission[]> = {
  // Admin-equivalent roles → all permissions.
  mactech_super_admin: ALL_GOVCON_PERMISSIONS,
  customer_owner: ALL_GOVCON_PERMISSIONS,
  customer_admin: ALL_GOVCON_PERMISSIONS,
  govcon_admin: ALL_GOVCON_PERMISSIONS,
  owner: ALL_GOVCON_PERMISSIONS,
  admin: ALL_GOVCON_PERMISSIONS,
  // Manager roles.
  govcon_manager: MANAGER_PERMISSIONS,
  capture_manager: MANAGER_PERMISSIONS,
  proposal_manager: MANAGER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  // Contributor roles.
  govcon_contributor: CONTRIBUTOR_PERMISSIONS,
  contributor: CONTRIBUTOR_PERMISSIONS,
  member: CONTRIBUTOR_PERMISSIONS,
  // Viewer / minimal roles. `read_only_user` is the Suite's least-privilege
  // baseline and what every non-admin member actually holds: read-only across
  // the app, plus their own profile — consistent with VIEWER_PERMISSIONS' rule
  // that every role manages its own profile.
  govcon_viewer: VIEWER_PERMISSIONS,
  read_only_user: VIEWER_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
  guest: VIEWER_PERMISSIONS,
};

/** Permissions granted to a role name (case-insensitive), or [] if unknown. */
export function permissionsForRole(role: string | null | undefined): GovConPermission[] {
  if (!role) return [];
  return GOVCON_ROLE_PERMISSIONS[role.toLowerCase()] ?? [];
}

/** Type guard for a raw string being a known GovCon permission. */
export function isGovConPermission(value: string): value is GovConPermission {
  return (ALL_GOVCON_PERMISSIONS as string[]).includes(value);
}
