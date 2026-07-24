import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { PROFILE_STATUS_STYLES } from "@/lib/ui/status";
import { cn } from "@/lib/ui/cn";
import type { TeamRosterEntry } from "@/lib/domain/team";

/**
 * The Team roster. Server-rendered — every cell is a read of merged
 * Hub-identity + local-capability data, and the alert pills are the point:
 * they say exactly what each member still owes the company statement
 * ("No resume", "No statement") rather than burying it in a detail page.
 */

/** Amber warning pill for a missing contribution input. */
function AlertPill({ label, title }: { label: string; title: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {label}
    </span>
  );
}

function shortId(hubUserId: string): string {
  return hubUserId.length > 12 ? `${hubUserId.slice(0, 12)}…` : hubUserId;
}

export function RosterTable({ entries }: { entries: TeamRosterEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="No team members yet"
        description="Members appear here once they exist in the Hub or start a profile in BizOps."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2.5 font-medium">Member</th>
            <th className="px-4 py-2.5 font-medium">Role / LCAT</th>
            <th className="px-4 py-2.5 font-medium">Profile</th>
            <th className="px-4 py-2.5 font-medium">Completeness</th>
            <th className="px-4 py-2.5 font-medium">Contribution alerts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e) => (
            <tr key={e.hubUserId} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link
                  href={`/team/${encodeURIComponent(e.hubUserId)}`}
                  className="flex items-center gap-3"
                >
                  <Avatar name={e.displayName} id={e.hubUserId} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800 hover:text-blue-600">
                      {e.displayName ?? shortId(e.hubUserId)}
                    </span>
                    {e.email ? (
                      <span className="block truncate text-xs text-slate-500">{e.email}</span>
                    ) : null}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="block text-slate-700">{e.headline ?? "—"}</span>
                {e.laborCategory ? (
                  <span className="block text-xs text-slate-500">{e.laborCategory}</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusPill
                  map={PROFILE_STATUS_STYLES}
                  value={e.profileStatus ?? "not_started"}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={e.completeness}
                    className="w-24"
                    label={`Profile completeness for ${e.displayName ?? e.hubUserId}`}
                    barClassName={cn(
                      e.completeness >= 80
                        ? "bg-emerald-500"
                        : e.completeness >= 40
                          ? "bg-blue-500"
                          : "bg-amber-500",
                    )}
                  />
                  <span className="text-xs tabular-nums text-slate-500">{e.completeness}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {e.isContributing ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    Contributing
                  </span>
                ) : (
                  <span className="flex flex-wrap gap-1.5">
                    {!e.hasResume ? (
                      <AlertPill
                        label="No resume"
                        title="No resume has been uploaded and parsed for this member."
                      />
                    ) : null}
                    {!e.hasStatement ? (
                      <AlertPill
                        label="No statement"
                        title="This member hasn't generated and confirmed a capability statement."
                      />
                    ) : null}
                    {e.hasResume && e.hasStatement && !e.isPublished ? (
                      <AlertPill
                        label="Not published"
                        title="Profile complete but not published — it can't feed the company statement yet."
                      />
                    ) : null}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
