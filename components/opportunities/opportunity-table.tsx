"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { HEALTH_STYLES, STAGE_STYLES, TEAM_ROLE_STYLES } from "@/lib/ui/status";
import { formatCurrency, formatDate, formatPercent, humanizeEnum } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { bulkArchiveAction } from "@/app/(app)/opportunities/bulk-actions";

export interface OppRow {
  id: string;
  internalName: string;
  solicitationNumber: string | null;
  agencyName: string | null;
  officeName: string | null;
  type: string;
  stage: string;
  teamRole: string;
  pWin: number | null;
  estimatedValue: number;
  weightedValue: number;
  proposalDeadline: string | null;
  captureOwnerId: string | null;
  proposalManagerId: string | null;
  health: string;
  nextAction: string | null;
}

const COLUMNS = [
  { key: "solicitationNumber", label: "Solicitation #" },
  { key: "agency", label: "Agency" },
  { key: "type", label: "Type" },
  { key: "role", label: "Role" },
  { key: "pWin", label: "PWin" },
  { key: "estimatedValue", label: "Est. Value" },
  { key: "weightedValue", label: "Weighted" },
  { key: "captureOwner", label: "Capture Owner" },
  { key: "health", label: "Health" },
  { key: "deadline", label: "Due" },
  { key: "nextAction", label: "Next Action" },
] as const;
type ColKey = (typeof COLUMNS)[number]["key"];
const DEFAULT_HIDDEN: ColKey[] = ["nextAction", "officeName" as ColKey];

const STAGES = Object.keys(STAGE_STYLES);
const HEALTHS = Object.keys(HEALTH_STYLES);

export function OpportunityTable({
  rows,
  total,
  page,
  pageCount,
  agencies,
  canExport,
  canArchive,
  filter,
}: {
  rows: OppRow[];
  total: number;
  page: number;
  pageCount: number;
  agencies: Array<{ id: string; name: string }>;
  canExport: boolean;
  canArchive: boolean;
  filter: { q?: string; stage?: string; health?: string; agencyId?: string; sortBy?: string; sortDir?: string; includeArchived?: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(filter.q ?? "");
  const [hidden, setHidden] = useState<Set<string>>(new Set(DEFAULT_HIDDEN));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCols, setShowCols] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = localStorage.getItem("gc:opp:hidden");
    if (stored) setHidden(new Set(JSON.parse(stored)));
  }, []);

  function setParam(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in updates)) next.set("page", "1");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filter.q ?? "") !== q) setParam({ q: q || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function toggleCol(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem("gc:opp:hidden", JSON.stringify([...next]));
      return next;
    });
  }

  const exportHref = useMemo(() => {
    const p = new URLSearchParams(params.toString());
    return `/api/opportunities/export?${p.toString()}`;
  }, [params]);

  function sortIndicator(col: string) {
    if (filter.sortBy !== col) return "";
    return filter.sortDir === "asc" ? " ▲" : " ▼";
  }
  function sortBy(col: string) {
    const dir = filter.sortBy === col && filter.sortDir === "asc" ? "desc" : "asc";
    setParam({ sortBy: col, sortDir: dir });
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onBulkArchive() {
    if (selected.size === 0) return;
    startTransition(async () => {
      await bulkArchiveAction([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  const show = (key: string) => !hidden.has(key);

  return (
    <div className="gc-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pursuits…"
            aria-label="Search opportunities"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          aria-label="Filter by stage"
          value={filter.stage ?? ""}
          onChange={(e) => setParam({ stage: e.target.value || undefined })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_STYLES[s].label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by health"
          value={filter.health ?? ""}
          onChange={(e) => setParam({ health: e.target.value || undefined })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All health</option>
          {HEALTHS.map((h) => (
            <option key={h} value={h}>
              {HEALTH_STYLES[h].label}
            </option>
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
            <option key={a.id} value={a.id}>
              {a.name.replace("[DEMO] ", "")}
            </option>
          ))}
        </select>

        <div className="relative">
          <Button variant="secondary" size="sm" onClick={() => setShowCols((s) => !s)}>
            <SlidersHorizontal className="h-4 w-4" /> Columns
          </Button>
          {showCols && (
            <div
              className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
              onMouseLeave={() => setShowCols(false)}
            >
              {COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={show(c.key)} onChange={() => toggleCol(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={filter.includeArchived ?? false}
            onChange={(e) => setParam({ includeArchived: e.target.checked ? "true" : undefined })}
          />
          Archived
        </label>

        {canExport && (
          <Button asChild variant="secondary" size="sm">
            <a href={exportHref}>
              <Download className="h-4 w-4" /> CSV
            </a>
          </Button>
        )}
        <Button asChild size="sm">
          <Link href="/opportunities/new">
            <Plus className="h-4 w-4" /> New
          </Link>
        </Button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && canArchive && (
        <div className="flex items-center gap-3 border-b border-slate-100 bg-blue-50 px-3 py-2 text-sm">
          <span className="text-blue-800">{selected.size} selected</span>
          <Button variant="secondary" size="sm" onClick={onBulkArchive} disabled={isPending}>
            Archive selected
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No opportunities match"
          description="Adjust your filters or create a new pursuit."
          action={
            <Button asChild size="sm">
              <Link href="/opportunities/new">New opportunity</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className={cn("hidden overflow-x-auto md:block", isPending && "opacity-60")}>
            <table className="gc-table">
              <thead>
                <tr>
                  {canArchive && (
                    <th className="w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                    </th>
                  )}
                  <th>
                    <button onClick={() => sortBy("internalName")} className="hover:text-slate-700">
                      Opportunity{sortIndicator("internalName")}
                    </button>
                  </th>
                  {show("solicitationNumber") && <th>Solicitation #</th>}
                  {show("agency") && <th>Agency</th>}
                  <th>
                    <button onClick={() => sortBy("stage")} className="hover:text-slate-700">
                      Stage{sortIndicator("stage")}
                    </button>
                  </th>
                  {show("type") && <th>Type</th>}
                  {show("role") && <th>Role</th>}
                  {show("pWin") && (
                    <th className="text-right">
                      <button onClick={() => sortBy("pWin")} className="hover:text-slate-700">
                        PWin{sortIndicator("pWin")}
                      </button>
                    </th>
                  )}
                  {show("estimatedValue") && (
                    <th className="text-right">
                      <button onClick={() => sortBy("estimatedValue")} className="hover:text-slate-700">
                        Est. Value{sortIndicator("estimatedValue")}
                      </button>
                    </th>
                  )}
                  {show("weightedValue") && <th className="text-right">Weighted</th>}
                  {show("captureOwner") && <th>Capture</th>}
                  {show("health") && <th>Health</th>}
                  {show("deadline") && (
                    <th>
                      <button onClick={() => sortBy("proposalDeadline")} className="hover:text-slate-700">
                        Due{sortIndicator("proposalDeadline")}
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    {canArchive && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleOne(o.id)}
                          aria-label={`Select ${o.internalName}`}
                        />
                      </td>
                    )}
                    <td className="max-w-[240px]">
                      <Link href={`/opportunities/${o.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                        {o.internalName}
                      </Link>
                    </td>
                    {show("solicitationNumber") && (
                      <td className="whitespace-nowrap text-slate-500">{o.solicitationNumber ?? "—"}</td>
                    )}
                    {show("agency") && <td className="max-w-[140px] truncate">{o.agencyName ?? "—"}</td>}
                    <td>
                      <StatusPill map={STAGE_STYLES} value={o.stage} />
                    </td>
                    {show("type") && <td className="whitespace-nowrap text-slate-500">{humanizeEnum(o.type)}</td>}
                    {show("role") && (
                      <td>
                        <StatusPill map={TEAM_ROLE_STYLES} value={o.teamRole} />
                      </td>
                    )}
                    {show("pWin") && <td className="text-right tabular-nums">{formatPercent(o.pWin)}</td>}
                    {show("estimatedValue") && (
                      <td className="text-right tabular-nums">{formatCurrency(o.estimatedValue)}</td>
                    )}
                    {show("weightedValue") && (
                      <td className="text-right tabular-nums text-slate-600">{formatCurrency(o.weightedValue)}</td>
                    )}
                    {show("captureOwner") && (
                      <td>{o.captureOwnerId ? <Avatar name={o.captureOwnerId} id={o.captureOwnerId} size="sm" /> : "—"}</td>
                    )}
                    {show("health") && (
                      <td>
                        <StatusPill map={HEALTH_STYLES} value={o.health} />
                      </td>
                    )}
                    {show("deadline") && (
                      <td className="whitespace-nowrap text-slate-500">{formatDate(o.proposalDeadline)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((o) => (
              <li key={o.id} className="p-3">
                <Link href={`/opportunities/${o.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800">{o.internalName}</span>
                    <StatusPill map={STAGE_STYLES} value={o.stage} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{o.agencyName ?? "—"}</span>
                    <span>{formatCurrency(o.estimatedValue)}</span>
                    <span>PWin {formatPercent(o.pWin)}</span>
                    <span>Due {formatDate(o.proposalDeadline)}</span>
                    <StatusPill map={HEALTH_STYLES} value={o.health} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-500">
        <span>
          {total} pursuit{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setParam({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <span className="px-2">
            {page} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setParam({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
