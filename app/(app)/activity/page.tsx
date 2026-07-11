import type { Metadata } from "next";
import Link from "next/link";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listActivity } from "@/lib/services/activity";
import { listNotifications } from "@/lib/services/notifications";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/misc";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MarkAllReadButton } from "@/components/activity/mark-all-read";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const ctx = await requireGovConContext();

  let feed: React.ReactNode;
  try {
    const activity = await listActivity(ctx, { limit: 100 });
    feed = (
      <Card>
        <CardHeader title="Workspace activity" description="The 100 most recent actions across every pursuit." />
        <ActivityFeed items={activity} />
      </Card>
    );
  } catch {
    feed = <ErrorState title="Activity unavailable" />;
  }

  const notifications = await listNotifications(ctx, 50);
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader title="Activity" subtitle="Audit trail and your notifications." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">{feed}</div>
        <div>
          <Card>
            <CardHeader
              title={`Notifications${unread > 0 ? ` (${unread})` : ""}`}
              action={<MarkAllReadButton disabled={unread === 0} />}
            />
            {notifications.length === 0 ? (
              <EmptyState title="No notifications" description="Assignments and mentions will show up here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const row = (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.readAt ? "bg-transparent" : "bg-blue-500",
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", n.readAt ? "text-slate-600" : "font-medium text-slate-800")}>
                          {n.title}
                        </p>
                        {n.body ? <p className="mt-0.5 truncate text-xs text-slate-500">{n.body}</p> : null}
                        <p className="mt-0.5 text-xs text-slate-400">
                          {humanizeEnum(n.type)} · {formatDate(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} className="block hover:bg-slate-50">
                          {row}
                        </Link>
                      ) : (
                        row
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
