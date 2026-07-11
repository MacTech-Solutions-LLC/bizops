import Link from "next/link";
import { ShieldAlert } from "lucide-react";

/** Human explanation + remediation for each Hub authority deny reason. */
const REASONS: Record<string, { title: string; detail: string; fix: string }> = {
  app_inactive: {
    title: "BizOps is not active in the Suite",
    detail:
      "BizOps is registered in the MacTech Suite but its AppRegistry status is not “active”. The Hub checks the app's status before any entitlement, so enabling the entitlement alone is not enough.",
    fix: "An admin must set the BizOps AppRegistry row to status “active” in the Suite (Admin → App Registry), then retry.",
  },
  entitlement_missing: {
    title: "No BizOps entitlement for this organization",
    detail: "Your organization does not have a BizOps product entitlement.",
    fix: "An admin must enable BizOps for your organization in the Suite (Admin → Product Access).",
  },
  entitlement_inactive: {
    title: "BizOps entitlement is inactive",
    detail: "Your organization's BizOps entitlement exists but is not active.",
    fix: "An admin must re-activate the BizOps entitlement in the Suite (Admin → Product Access).",
  },
  entitlement_expired: {
    title: "BizOps entitlement has expired",
    detail: "Your organization's BizOps entitlement is past its expiration date.",
    fix: "An admin must renew the BizOps entitlement window in the Suite (Admin → Product Access).",
  },
  membership_missing: {
    title: "You are not a member of this organization",
    detail: "The Hub has no active membership linking your account to this organization.",
    fix: "An admin must grant you membership in this organization in the Suite.",
  },
  membership_inactive: {
    title: "Your organization membership is inactive",
    detail: "Your membership in this organization is not active.",
    fix: "An admin must re-activate your membership in the Suite.",
  },
  organization_missing: {
    title: "Organization not found in the Suite",
    detail: "The selected organization is not synced as an active customer organization in the Hub.",
    fix: "Select a different organization, or ask an admin to sync/activate this organization.",
  },
  organization_inactive: {
    title: "Organization is inactive",
    detail: "This organization is not active in the Suite.",
    fix: "An admin must resolve the organization's status in the Suite.",
  },
  user_missing: {
    title: "Your account is not synced to the Suite",
    detail: "Your Clerk account is not yet linked to a Hub user profile.",
    fix: "Ask an admin to sync your user into the Suite.",
  },
  user_inactive: {
    title: "Your account is inactive",
    detail: "Your Hub user profile is not active.",
    fix: "An admin must re-activate your account in the Suite.",
  },
  org_context_required: {
    title: "Select an organization",
    detail: "BizOps requires an active organization context.",
    fix: "Choose an organization to continue.",
  },
  role_resolution_failed: {
    title: "No role resolved for your access",
    detail: "The Hub could not resolve a role or permissions for your access.",
    fix: "An admin must attach a role template or permissions for your membership.",
  },
  hub_unavailable: {
    title: "The Hub is temporarily unavailable",
    detail: "BizOps could not reach the MacTech Hub to authorize access.",
    fix: "This is usually transient — please retry in a moment.",
  },
};

export default function AccessDeniedPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  const code = searchParams?.reason;
  const info = code ? REASONS[code] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          {info?.title ?? "Access denied"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {info?.detail ??
            "The MacTech Hub did not authorize BizOps access for this account or organization."}
        </p>
        {info?.fix ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-medium">How to fix: </span>
            {info.fix}
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Try selecting a different organization, or ask an admin to enable BizOps in Product
            Access.
          </p>
        )}
        {code ? (
          <p className="mt-4 text-xs text-slate-400">
            Reason code: <code className="rounded bg-slate-100 px-1 py-0.5">{code}</code>
          </p>
        ) : null}
        <div className="mt-6 flex gap-2">
          <Link
            href="/choose-organization"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Choose organization
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Retry
          </Link>
        </div>
      </div>
    </main>
  );
}
