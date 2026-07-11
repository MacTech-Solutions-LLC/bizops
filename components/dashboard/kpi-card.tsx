import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/ui/cn";

/**
 * KPI card — a single database-backed metric that links to its filtered view.
 * `tone` tints the accent bar; `hint` gives a meaningful comparison/subtext.
 */
export function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "blue",
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  tone?: "blue" | "teal" | "violet" | "green" | "amber" | "orange" | "red" | "slate";
  emphasis?: boolean;
}) {
  const toneBar: Record<string, string> = {
    blue: "bg-blue-500",
    teal: "bg-teal-500",
    violet: "bg-violet-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    slate: "bg-slate-400",
  };
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <span className={cn("absolute inset-x-0 top-0 h-1", toneBar[tone])} aria-hidden="true" />
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
      </div>
      <span className={cn("mt-2 font-semibold text-slate-900", emphasis ? "text-3xl" : "text-2xl")}>
        {value}
      </span>
      {hint ? <span className="mt-1 text-xs text-slate-500">{hint}</span> : null}
    </Link>
  );
}
