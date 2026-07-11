"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";

export interface ContactRow {
  id: string;
  name: string;
  title: string | null;
  agencyName: string | null;
  officeName: string | null;
  acquisitionRole: string | null;
  influence: string | null;
  relationshipStrength: string | null;
  lastInteractionAt: string | null;
}

const INFLUENCE_CLS: Record<string, string> = {
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  medium: "bg-blue-50 text-blue-700 ring-blue-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function ContactTable({
  rows,
  agencies,
  filter,
  canCreate,
}: {
  rows: ContactRow[];
  agencies: Array<{ id: string; name: string }>;
  filter: { q?: string; agencyId?: string };
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
            placeholder="Search contacts…"
            aria-label="Search contacts"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          aria-label="Filter by agency"
          value={filter.agencyId ?? ""}
          onChange={(e) => setParam({ agencyId: e.target.value || undefined })}
          className="h-9 max-w-[200px] rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All agencies</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>{a.name.replace("[DEMO] ", "")}</option>
          ))}
        </select>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/contacts/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No contacts"
          description="Track government, teaming, and industry relationships."
          action={canCreate ? (
            <Button asChild size="sm"><Link href="/contacts/new">New contact</Link></Button>
          ) : undefined}
        />
      ) : (
        <div className={cn("overflow-x-auto", isPending && "opacity-60")}>
          <table className="gc-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Agency / Office</th>
                <th>Role</th>
                <th>Influence</th>
                <th>Relationship</th>
                <th>Last contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="max-w-[220px]">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-slate-800 hover:text-blue-600">{c.name}</Link>
                    <p className="truncate text-xs text-slate-500">{c.title ?? "—"}</p>
                  </td>
                  <td className="max-w-[180px] truncate text-slate-500">
                    {c.agencyName ?? "—"}{c.officeName ? ` · ${c.officeName}` : ""}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{c.acquisitionRole ?? "—"}</td>
                  <td>
                    {c.influence ? (
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", INFLUENCE_CLS[c.influence] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>
                        {humanizeEnum(c.influence)}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="capitalize text-slate-500">{c.relationshipStrength ?? "—"}</td>
                  <td className="whitespace-nowrap text-slate-500">{formatDate(c.lastInteractionAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
