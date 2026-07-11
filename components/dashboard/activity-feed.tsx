import Link from "next/link";
import { formatDate } from "@/lib/ui/format";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";

export interface ActivityItem {
  id: string;
  action: string;
  summary: string | null;
  actorId: string | null;
  createdAt: Date | string;
  opportunity: { id: string; internalName: string } | null;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="No activity yet" description="Actions across the workspace will appear here." />;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-4 py-3">
          <Avatar name={item.actorId ?? "System"} id={item.actorId} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700">{item.summary ?? item.action}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {item.opportunity ? (
                <>
                  <Link
                    href={`/opportunities/${item.opportunity.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {item.opportunity.internalName}
                  </Link>
                  {" · "}
                </>
              ) : null}
              {formatDate(item.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
