import type { Metadata } from "next";
import Link from "next/link";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listProposals } from "@/lib/services/proposals";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, ErrorState, EmptyState, ProgressBar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { VOLUME_STATUS_STYLES } from "@/lib/ui/status";
import { formatDate, formatDueRelative } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";

export const metadata: Metadata = { title: "Proposal Room" };
export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const ctx = await requireGovConContext();
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);

  let body: React.ReactNode;
  try {
    const proposals = await listProposals(ctx);
    if (proposals.length === 0) {
      body = (
        <EmptyState
          title="No proposals yet"
          description="Stand up a proposal room for a pursuit to manage volumes, the compliance matrix, and color reviews."
          action={
            canManage ? (
              <Button asChild size="sm">
                <Link href="/proposals/new">New proposal</Link>
              </Button>
            ) : undefined
          }
        />
      );
    } else {
      body = (
        <div className="gc-card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="gc-table">
              <thead>
                <tr>
                  <th>Proposal</th>
                  <th>Pursuit</th>
                  <th>Status</th>
                  <th>Manager</th>
                  <th className="text-right">Volumes</th>
                  <th className="w-52">Requirement coverage</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => {
                  const due = formatDueRelative(p.dueAt ?? null);
                  return (
                    <tr key={p.id}>
                      <td className="max-w-[240px]">
                        <Link
                          href={`/proposals/${p.id}`}
                          className="font-medium text-slate-800 hover:text-blue-600"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate text-slate-500">
                        <Link href={`/opportunities/${p.opportunityId}`} className="hover:text-blue-600">
                          {p.opportunityName}
                        </Link>
                      </td>
                      <td>
                        <StatusPill map={VOLUME_STATUS_STYLES} value={p.status} />
                      </td>
                      <td>
                        {p.managerId ? (
                          <Avatar name={p.managerId} id={p.managerId} size="sm" />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-right tabular-nums text-slate-600">{p.volumeCount}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <ProgressBar
                            value={p.coverage.coveragePercent}
                            className="w-28"
                            label={`Coverage ${p.coverage.coveragePercent}%`}
                          />
                          <span className="whitespace-nowrap text-xs text-slate-500">
                            {p.coverage.total - p.coverage.unassigned}/{p.coverage.total}
                          </span>
                        </div>
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap text-slate-500",
                          due.overdue && "text-red-600",
                          due.soon && "text-amber-600",
                        )}
                      >
                        {formatDate(p.dueAt ?? null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {proposals.map((p) => (
              <li key={p.id} className="p-3">
                <Link href={`/proposals/${p.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800">{p.title}</span>
                    <StatusPill map={VOLUME_STATUS_STYLES} value={p.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{p.opportunityName}</span>
                    <span>
                      {p.volumeCount} vol · {p.coverage.coveragePercent}% covered
                    </span>
                    <span>Due {formatDate(p.dueAt ?? null)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  } catch {
    body = <ErrorState title="Proposals unavailable" />;
  }

  return (
    <>
      <PageHeader
        title="Proposal Room"
        subtitle="Volumes, compliance matrix, and color reviews across every active proposal."
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link href="/proposals/new">New proposal</Link>
            </Button>
          ) : undefined
        }
      />
      {body}
    </>
  );
}
