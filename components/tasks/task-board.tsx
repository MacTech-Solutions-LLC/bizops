"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { PRIORITY_STYLES, TASK_STATUS_STYLES } from "@/lib/ui/status";
import { formatDueRelative } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { changeTaskStatusAction } from "@/app/(app)/tasks/actions";

export interface TaskCard {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueAt: string | null;
  opportunity: { id: string; internalName: string } | null;
}

export function TaskBoard({
  columns,
  tasksByStatus,
  canManage,
}: {
  columns: string[];
  tasksByStatus: Record<string, TaskCard[]>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<"board" | "list">("board");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = columns.reduce((n, c) => n + (tasksByStatus[c]?.length ?? 0), 0);

  function onDrop(status: string) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id || !canManage) return;
    const current = columns.find((c) => tasksByStatus[c]?.some((t) => t.id === id));
    if (current === status) return;
    startTransition(async () => {
      const res = await changeTaskStatusAction(id, status);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not move task");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setView("board")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "board" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700",
            )}
            aria-pressed={view === "board"}
          >
            <LayoutGrid className="h-4 w-4" /> Board
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "list" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700",
            )}
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" /> List
          </button>
        </div>
        <Button asChild size="sm">
          <Link href="/tasks/new">
            <Plus className="h-4 w-4" /> New task
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {total === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Create a task to start tracking capture and proposal work."
          action={
            <Button asChild size="sm">
              <Link href="/tasks/new">New task</Link>
            </Button>
          }
        />
      ) : view === "board" ? (
        <div className={cn("flex gap-3 overflow-x-auto pb-2", isPending && "opacity-70")}>
          {columns.map((status) => {
            const tasks = tasksByStatus[status] ?? [];
            return (
              <div
                key={status}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-slate-50/60",
                  overCol === status ? "border-blue-400 ring-1 ring-blue-300" : "border-slate-200",
                )}
                onDragOver={(e) => {
                  if (!canManage) return;
                  e.preventDefault();
                  setOverCol(status);
                }}
                onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
                onDrop={() => onDrop(status)}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <StatusPill map={TASK_STATUS_STYLES} value={status} />
                  <span className="text-xs font-medium text-slate-400">{tasks.length}</span>
                </div>
                <div className="flex flex-col gap-2 px-2 pb-2">
                  {tasks.map((task) => (
                    <TaskCardView
                      key={task.id}
                      task={task}
                      draggable={canManage}
                      dragging={dragId === task.id}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))}
                  {tasks.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-slate-400">Drop tasks here</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="gc-card overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {columns.flatMap((status) => tasksByStatus[status] ?? []).map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                <StatusPill map={TASK_STATUS_STYLES} value={task.status} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{task.title}</span>
                <StatusPill map={PRIORITY_STYLES} value={task.priority} />
                {task.opportunity ? (
                  <Link
                    href={`/opportunities/${task.opportunity.id}`}
                    className="hidden max-w-[160px] truncate text-xs text-blue-600 hover:underline sm:block"
                  >
                    {task.opportunity.internalName}
                  </Link>
                ) : null}
                <DuePill dueAt={task.dueAt} />
                {task.assigneeId ? <Avatar name={task.assigneeId} id={task.assigneeId} size="sm" /> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TaskCardView({
  task,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: TaskCard;
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
        draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <p className="text-sm font-medium text-slate-800">{task.title}</p>
      {task.opportunity ? (
        <Link
          href={`/opportunities/${task.opportunity.id}`}
          className="mt-1 block truncate text-xs text-blue-600 hover:underline"
        >
          {task.opportunity.internalName}
        </Link>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StatusPill map={PRIORITY_STYLES} value={task.priority} />
          <DuePill dueAt={task.dueAt} />
        </div>
        {task.assigneeId ? <Avatar name={task.assigneeId} id={task.assigneeId} size="sm" /> : null}
      </div>
    </div>
  );
}

function DuePill({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const due = formatDueRelative(dueAt);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        due.overdue
          ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
          : due.soon
            ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200"
            : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
      )}
    >
      {due.label}
    </span>
  );
}
