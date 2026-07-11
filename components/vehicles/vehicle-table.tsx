"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/misc";
import { VEHICLE_STATUS_STYLES } from "@/lib/ui/status";
import { VEHICLE_STATUSES } from "@/lib/ui/enums";
import { formatCurrency, formatDate } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";

export interface VehicleRow {
  id: string;
  name: string;
  vehicleType: string | null;
  agency: string | null;
  primeHolder: string | null;
  ceiling: number | null;
  orderingStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  taskOrderCount: number;
}

export function VehicleTable({
  rows,
  filter,
  canCreate,
}: {
  rows: VehicleRow[];
  filter: { q?: string; status?: string };
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
            placeholder="Search vehicles…"
            aria-label="Search contract vehicles"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={filter.status ?? ""}
          onChange={(e) => setParam({ status: e.target.value || undefined })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All statuses</option>
          {VEHICLE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/vehicles/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No contract vehicles"
          description="Track the IDIQ/GWAC/BPA/GSA vehicles you can order or team through."
          action={canCreate ? (
            <Button asChild size="sm"><Link href="/vehicles/new">New vehicle</Link></Button>
          ) : undefined}
        />
      ) : (
        <div className={cn("overflow-x-auto", isPending && "opacity-60")}>
          <table className="gc-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Agency</th>
                <th>Prime holder</th>
                <th className="text-right">Ceiling</th>
                <th>Ordering</th>
                <th>Period</th>
                <th className="text-right">Task orders</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className="max-w-[220px]">
                    <Link href={`/vehicles/${v.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                      {v.name.replace("[DEMO] ", "")}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{v.vehicleType ?? "—"}</td>
                  <td className="max-w-[140px] truncate text-slate-500">{v.agency ?? "—"}</td>
                  <td className="max-w-[160px] truncate text-slate-500">{v.primeHolder ?? "—"}</td>
                  <td className="text-right tabular-nums">{formatCurrency(v.ceiling)}</td>
                  <td className="whitespace-nowrap text-slate-500">{v.orderingStatus ?? "—"}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(v.startDate)} – {formatDate(v.endDate)}
                  </td>
                  <td className="text-right tabular-nums text-slate-600">{v.taskOrderCount}</td>
                  <td><StatusPill map={VEHICLE_STATUS_STYLES} value={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
