"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/misc";
import { SBIR_RECOMMENDATION_STYLES, styleFor } from "@/lib/ui/status";
import { SBIR_PHASES, SBIR_PROGRAMS } from "@/lib/ui/enums";
import { formatCurrency, formatDueRelative, humanizeEnum } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";

export interface SbirRow {
  id: string;
  program: string;
  component: string | null;
  agencyName: string | null;
  topicNumber: string;
  topicTitle: string;
  phase: string;
  closeDate: string | null;
  recommendation: string | null;
  weightedScore: number | null;
  awardRangeMax: number | null;
}

export function SbirTable({
  rows,
  agencies,
  filter,
  canCreate,
}: {
  rows: SbirRow[];
  agencies: Array<{ id: string; name: string }>;
  filter: { q?: string; program?: string; phase?: string; agencyId?: string };
  canCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(filter.q ?? "");
  const [isPending, startTransition] = useTransition();

  function setParam(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((filter.q ?? "") !== q) setParam({ q: q || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="gc-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search topics…"
            aria-label="Search SBIR topics"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          aria-label="Filter by program"
          value={filter.program ?? ""}
          onChange={(e) => setParam({ program: e.target.value || undefined })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All programs</option>
          {SBIR_PROGRAMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by phase"
          value={filter.phase ?? ""}
          onChange={(e) => setParam({ phase: e.target.value || undefined })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All phases</option>
          {SBIR_PHASES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by agency"
          value={filter.agencyId ?? ""}
          onChange={(e) => setParam({ agencyId: e.target.value || undefined })}
          className="h-9 max-w-[180px] rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All agencies</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>{a.name.replace("[DEMO] ", "")}</option>
          ))}
        </select>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/sbir/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No SBIR/STTR topics"
          description="Adjust your filters or add a topic to track."
          action={canCreate ? (
            <Button asChild size="sm"><Link href="/sbir/new">New topic</Link></Button>
          ) : undefined}
        />
      ) : (
        <div className={cn("overflow-x-auto", isPending && "opacity-60")}>
          <table className="gc-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Topic</th>
                <th>Agency</th>
                <th>Phase</th>
                <th className="text-right">Award max</th>
                <th className="text-right">Fit</th>
                <th>Recommendation</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const due = formatDueRelative(r.closeDate);
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap font-medium text-slate-600">{r.program}</td>
                    <td className="max-w-[280px]">
                      <Link href={`/sbir/${r.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                        {r.topicNumber}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{r.topicTitle}</p>
                    </td>
                    <td className="max-w-[140px] truncate text-slate-500">{r.agencyName ?? r.component ?? "—"}</td>
                    <td className="whitespace-nowrap text-slate-500">{humanizeEnum(r.phase)}</td>
                    <td className="text-right tabular-nums">{formatCurrency(r.awardRangeMax)}</td>
                    <td className="text-right tabular-nums text-slate-600">
                      {r.weightedScore === null ? "—" : r.weightedScore.toFixed(0)}
                    </td>
                    <td>
                      {r.recommendation ? (
                        <StatusPill style={styleFor(SBIR_RECOMMENDATION_STYLES, r.recommendation)} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {r.closeDate ? (
                        <span className={cn(
                          "text-sm",
                          due.overdue ? "font-medium text-red-600" : due.soon ? "font-medium text-amber-600" : "text-slate-500",
                        )}>
                          {due.label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
