import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FileText, HelpCircle } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getCalendarAgenda, type CalendarEntry, type CalendarKind } from "@/lib/services/calendar";
import { formatDate, formatDueRelative } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { Card } from "@/components/ui/card";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const KIND_META: Record<CalendarKind, { label: string; className: string; icon: typeof CalendarClock }> = {
  milestone: { label: "Milestone", className: "bg-violet-50 text-violet-700 ring-violet-200", icon: CalendarClock },
  questions_deadline: { label: "Questions due", className: "bg-amber-50 text-amber-800 ring-amber-200", icon: HelpCircle },
  proposal_deadline: { label: "Proposal due", className: "bg-blue-50 text-blue-700 ring-blue-200", icon: FileText },
};

/** Monday 00:00 of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

export default async function CalendarPage() {
  const ctx = await requireGovConContext();

  let body: React.ReactNode;
  try {
    const entries = await getCalendarAgenda(ctx, 60);
    if (entries.length === 0) {
      body = (
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-8 w-8" />}
            title="Nothing due in the next 60 days"
            description="Milestones and pursuit deadlines will appear here as an agenda."
          />
        </Card>
      );
    } else {
      // Group into weeks, preserving date order.
      const weeks = new Map<number, { start: Date; items: CalendarEntry[] }>();
      for (const entry of entries) {
        const start = weekStart(entry.date);
        const key = start.getTime();
        const bucket = weeks.get(key) ?? { start, items: [] };
        bucket.items.push(entry);
        weeks.set(key, bucket);
      }
      const ordered = [...weeks.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
      body = (
        <div className="space-y-5">
          {ordered.map((week) => {
            const end = new Date(week.start);
            end.setDate(end.getDate() + 6);
            return (
              <section key={week.start.getTime()}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Week of {formatDate(week.start)} – {formatDate(end)}
                </h2>
                <Card>
                  <ul className="divide-y divide-slate-100">
                    {week.items.map((entry) => (
                      <AgendaRow key={entry.id} entry={entry} />
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      );
    }
  } catch {
    body = <ErrorState title="Calendar unavailable" />;
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Upcoming milestones and pursuit deadlines for the next 60 days."
      />
      <Legend />
      {body}
    </>
  );
}

function Legend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <span className="font-medium text-slate-600">Legend:</span>
      {(Object.keys(KIND_META) as CalendarKind[]).map((kind) => {
        const meta = KIND_META[kind];
        const Icon = meta.icon;
        return (
          <span
            key={kind}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 ring-inset", meta.className)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function AgendaRow({ entry }: { entry: CalendarEntry }) {
  const meta = KIND_META[entry.kind];
  const Icon = meta.icon;
  const due = formatDueRelative(entry.date);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", meta.className)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {entry.opportunity ? (
            <Link href={`/opportunities/${entry.opportunity.id}`} className="hover:text-blue-600">
              {entry.title}
            </Link>
          ) : (
            entry.title
          )}
        </p>
        <p className="text-xs text-slate-400">
          {meta.label} · {formatDate(entry.date)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-xs font-medium",
          due.overdue ? "text-red-600" : due.soon ? "text-amber-600" : "text-slate-500",
        )}
      >
        {due.label}
      </span>
    </li>
  );
}
