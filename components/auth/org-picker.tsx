"use client";

import { useState } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { Building2, ArrowRight } from "lucide-react";
import { selectOrganizationAction } from "@/app/choose-organization/actions";

/**
 * Explicit organization picker. Replaces Clerk's <OrganizationList>, whose
 * built-in `afterSelectOrganizationUrl` navigation was not firing here (the
 * click set the active org but the page did not advance). This controls the
 * flow directly: setActive → refresh (so the server session sees the org) →
 * push to the dashboard.
 */
export function OrgPicker() {
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) {
    return <p className="text-sm text-slate-500">Loading organizations…</p>;
  }

  const memberships = userMemberships?.data ?? [];

  async function choose(orgId: string) {
    if (!setActive) return;
    setBusyId(orgId);
    setError(null);
    try {
      // Update Clerk's client-side active org (keeps the topbar switcher in
      // sync), then record it server-side and continue — the server action's
      // cookie is what the server reads on the next request, avoiding the Clerk
      // SSR propagation race.
      await setActive({ organization: orgId }).catch(() => {});
      await selectOrganizationAction(orgId);
    } catch {
      setError("Could not select that organization. Please try again.");
      setBusyId(null);
    }
  }

  if (memberships.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        You are not a member of any organization yet. Ask an admin to add you, or create one.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {error ? (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <ul className="divide-y divide-slate-100">
        {memberships.map((m) => (
          <li key={m.organization.id}>
            <button
              type="button"
              onClick={() => choose(m.organization.id)}
              disabled={busyId !== null}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Building2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {m.organization.name}
                </span>
                {m.role ? (
                  <span className="block truncate text-xs text-slate-400">{m.role}</span>
                ) : null}
              </span>
              {busyId === m.organization.id ? (
                <span className="text-xs text-slate-400">Opening…</span>
              ) : (
                <ArrowRight className="h-4 w-4 text-slate-300" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
