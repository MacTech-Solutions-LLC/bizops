"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GitCompare, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { AGREEMENT_STYLES, BUSINESS_SIZE_STYLES, styleFor } from "@/lib/ui/status";
import { BUSINESS_SIZES } from "@/lib/ui/enums";
import { cn } from "@/lib/ui/cn";

export interface PartnerRow {
  id: string;
  legalName: string;
  uei: string | null;
  cageCode: string | null;
  businessSize: string;
  socioeconomicStatus: string[];
  ndaStatus: string;
  teamingStatus: string;
  relationshipOwner: string | null;
}

export function PartnerTable({
  rows,
  filter,
  canCreate,
}: {
  rows: PartnerRow[];
  filter: { q?: string; businessSize?: string };
  canCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(filter.q ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function compare() {
    if (selected.size < 2) return;
    router.push(`/partners/compare?ids=${[...selected].join(",")}`);
  }

  return (
    <div className="gc-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search partners…"
            aria-label="Search partners"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          aria-label="Filter by business size"
          value={filter.businessSize ?? ""}
          onChange={(e) => setParam({ businessSize: e.target.value || undefined })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All sizes</option>
          {BUSINESS_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={compare} disabled={selected.size < 2}>
          <GitCompare className="h-4 w-4" /> Compare ({selected.size})
        </Button>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/partners/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No teaming partners"
          description="Add partners to build your teaming network."
          action={canCreate ? (
            <Button asChild size="sm"><Link href="/partners/new">New partner</Link></Button>
          ) : undefined}
        />
      ) : (
        <div className={cn("overflow-x-auto", isPending && "opacity-60")}>
          <table className="gc-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Partner</th>
                <th>UEI / CAGE</th>
                <th>Size</th>
                <th>Socioeconomic</th>
                <th>NDA</th>
                <th>Teaming</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={`Select ${p.legalName} to compare`}
                    />
                  </td>
                  <td className="max-w-[240px]">
                    <Link href={`/partners/${p.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                      {p.legalName.replace("[DEMO] ", "")}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-xs text-slate-500">
                    {p.uei ?? "—"}{p.cageCode ? ` / ${p.cageCode}` : ""}
                  </td>
                  <td>
                    <StatusPill style={styleFor(BUSINESS_SIZE_STYLES, p.businessSize)} />
                  </td>
                  <td className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {p.socioeconomicStatus.length ? (
                        p.socioeconomicStatus.map((s) => (
                          <span key={s} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700 ring-1 ring-inset ring-teal-200">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td><StatusPill map={AGREEMENT_STYLES} value={p.ndaStatus} /></td>
                  <td><StatusPill map={AGREEMENT_STYLES} value={p.teamingStatus} /></td>
                  <td>{p.relationshipOwner ? <Avatar name={p.relationshipOwner} id={p.relationshipOwner} size="sm" /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
