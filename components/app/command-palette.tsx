"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { ALL_NAV_ITEMS } from "./nav-config";
import type { SearchResult } from "@/lib/services/search";
import { cn } from "@/lib/ui/cn";

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  href: string;
}

const TYPE_LABEL: Record<string, string> = {
  opportunity: "Opportunity",
  sbir: "SBIR/STTR",
  agency: "Agency",
  partner: "Partner",
  contact: "Contact",
  task: "Task",
  vehicle: "Vehicle",
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced tenant-safe search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = (await res.json()) as { results: SearchResult[] };
          setResults(data.results ?? []);
          setActive(0);
        }
      } catch {
        /* aborted or offline — ignore */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const navCommands: Command[] = ALL_NAV_ITEMS.filter((n) =>
    query.trim().length === 0 ? true : n.label.toLowerCase().includes(query.toLowerCase()),
  ).map((n) => ({ id: `nav:${n.href}`, title: n.label, group: "Navigate", href: n.href }));

  const resultCommands: Command[] = results.map((r) => ({
    id: `res:${r.type}:${r.id}`,
    title: r.title,
    subtitle: r.subtitle,
    group: TYPE_LABEL[r.type] ?? "Result",
    href: r.href,
  }));

  const commands = [...resultCommands, ...navCommands];

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = commands[active];
      if (cmd) go(cmd.href);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pursuits, partners, contacts… or jump to a section"
            className="h-12 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="Search"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {commands.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              {query.trim().length < 2 ? "Type to search…" : "No matches"}
            </p>
          ) : (
            commands.map((cmd, i) => (
              <button
                key={cmd.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(cmd.href)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm",
                  i === active ? "bg-blue-50" : "hover:bg-slate-50",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-slate-800">{cmd.title}</span>
                  {cmd.subtitle && (
                    <span className="block truncate text-xs text-slate-400">{cmd.subtitle}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    {cmd.group}
                  </span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
