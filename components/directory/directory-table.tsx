"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { humanizeEnum } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";

export interface DirectoryRow {
  id: string;
  name: string;
  kind: string;
  title: string | null;
  organizationName: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
}

const KIND_CLS: Record<string, string> = {
  INTERNAL: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  EXTERNAL: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function DirectoryTable({
  rows,
  organizations,
  filter,
  canManage,
}: {
  rows: DirectoryRow[];
  organizations: Array<{ id: string; name: string }>;
  filter: { q?: string; kind?: string; organizationId?: string };
  canManage: boolean;
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
            placeholder="Search people…"
            aria-label="Search people"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          aria-label="Filter internal or external"
          value={filter.kind ?? ""}
          onChange={(e) => setParam({ kind: e.target.value || undefined })}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">Everyone</option>
          <option value="INTERNAL">Internal</option>
          <option value="EXTERNAL">External</option>
        </select>
        <select
          aria-label="Filter by organization"
          value={filter.organizationId ?? ""}
          onChange={(e) => setParam({ organizationId: e.target.value || undefined })}
          className="h-9 max-w-[200px] rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="">All organizations</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/directory/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No people yet"
          description="The directory is the company address book — internal teammates and external contracting contacts."
          action={canManage ? (
            <Button asChild size="sm"><Link href="/directory/new">New contact</Link></Button>
          ) : undefined}
        />
      ) : (
        <div className={cn("overflow-x-auto", isPending && "opacity-60")}>
          <table className="gc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Organization</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="max-w-[220px]">
                    <Link href={`/directory/${c.id}`} className="font-medium text-slate-800 hover:text-blue-600">{c.name}</Link>
                    <p className="truncate text-xs text-slate-500">{c.title ?? "—"}</p>
                  </td>
                  <td>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", KIND_CLS[c.kind] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>
                      {humanizeEnum(c.kind)}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate text-slate-500">{c.organizationName ?? "—"}</td>
                  <td className="max-w-[200px] truncate text-slate-500">
                    {c.email ? <a href={`mailto:${c.email}`} className="hover:text-blue-600">{c.email}</a> : "—"}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{c.phone ?? "—"}</td>
                  <td className="max-w-[160px]">
                    {c.tags.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t}</span>
                        ))}
                        {c.tags.length > 3 ? <span className="text-xs text-slate-400">+{c.tags.length - 3}</span> : null}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
