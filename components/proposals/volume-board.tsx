"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/misc";
import { VOLUME_STATUS_STYLES } from "@/lib/ui/status";
import { formatDate } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { changeVolumeStatusAction } from "@/app/(app)/proposals/[id]/actions";

export interface BoardVolume {
  id: string;
  name: string;
  ownerId: string | null;
  status: string;
  dueAt: string | null;
  pageLimit: number | null;
  currentPages: number | null;
  requirementCount: number;
}

/** The six GovConVolumeStatus values, left-to-right workflow order. */
const COLUMNS: string[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "INTERNAL_REVIEW",
  "REVISION_REQUIRED",
  "APPROVED",
  "COMPLETE",
];

export function VolumeBoard({
  proposalId,
  volumes,
  canManage,
}: {
  proposalId: string;
  volumes: BoardVolume[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(volumes);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(volumeId: string, status: string) {
    const current = items.find((v) => v.id === volumeId);
    if (!current || current.status === status) return;
    // Optimistic update.
    const previous = items;
    setItems((prev) => prev.map((v) => (v.id === volumeId ? { ...v, status } : v)));
    setError(null);
    startTransition(async () => {
      const res = await changeVolumeStatusAction(volumeId, status, proposalId);
      if (res.ok) {
        router.refresh();
      } else {
        setItems(previous);
        setError(res.error ?? "Could not move volume");
      }
    });
  }

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}
      <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6", pending && "opacity-70")}>
        {COLUMNS.map((col) => {
          const style = VOLUME_STATUS_STYLES[col];
          const colVolumes = items.filter((v) => v.status === col);
          return (
            <div
              key={col}
              onDragOver={(e) => {
                if (!canManage || !dragId) return;
                e.preventDefault();
                setOverCol(col);
              }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (canManage && dragId) move(dragId, col);
                setDragId(null);
              }}
              className={cn(
                "flex min-h-[120px] flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-2",
                overCol === col && "ring-2 ring-blue-400",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <span className={cn("h-1.5 w-1.5 rounded-full", style?.dot)} aria-hidden="true" />
                  {style?.label ?? col}
                </span>
                <span className="text-xs tabular-nums text-slate-400">{colVolumes.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {colVolumes.map((v) => (
                  <article
                    key={v.id}
                    draggable={canManage}
                    onDragStart={() => setDragId(v.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    className={cn(
                      "rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm",
                      canManage && "cursor-grab active:cursor-grabbing",
                      dragId === v.id && "opacity-50",
                    )}
                  >
                    <p className="text-sm font-medium text-slate-800">{v.name}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        {v.ownerId ? (
                          <Avatar name={v.ownerId} id={v.ownerId} size="sm" />
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </span>
                      <span className="whitespace-nowrap">{formatDate(v.dueAt)}</span>
                    </div>
                    {v.pageLimit ? (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Pages</span>
                          <span className="tabular-nums">
                            {v.currentPages ?? 0}/{v.pageLimit}
                          </span>
                        </div>
                        <ProgressBar
                          value={v.currentPages ?? 0}
                          max={v.pageLimit}
                          className="mt-0.5 h-1.5"
                          barClassName={cn((v.currentPages ?? 0) > v.pageLimit && "bg-red-500")}
                          label={`${v.name} pages`}
                        />
                      </div>
                    ) : null}
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {v.requirementCount} requirement{v.requirementCount === 1 ? "" : "s"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {canManage ? (
        <p className="text-xs text-slate-400">Drag a volume card between columns to change its status.</p>
      ) : null}
    </div>
  );
}
