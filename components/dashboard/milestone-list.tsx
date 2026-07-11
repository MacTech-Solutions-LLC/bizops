import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { formatDueRelative, humanizeEnum } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { EmptyState } from "@/components/ui/misc";

export interface MilestoneItem {
  id: string;
  title: string;
  type: string;
  dueAt: Date | string | null;
  opportunity: { id: string; internalName: string } | null;
}

export function MilestoneList({ items }: { items: MilestoneItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-8 w-8" />}
        title="No upcoming milestones"
        description="Schedule reviews and deadlines on a pursuit to see them here."
      />
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((m) => {
        const due = formatDueRelative(m.dueAt);
        return (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                due.overdue ? "bg-red-50 text-red-600" : due.soon ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500",
              )}
            >
              <CalendarClock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700">{m.title}</p>
              <p className="truncate text-xs text-slate-400">
                {humanizeEnum(m.type)}
                {m.opportunity ? (
                  <>
                    {" · "}
                    <Link href={`/opportunities/${m.opportunity.id}`} className="text-blue-600 hover:underline">
                      {m.opportunity.internalName}
                    </Link>
                  </>
                ) : null}
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
      })}
    </ul>
  );
}
