"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { STAGE_STYLES } from "@/lib/ui/status";
import { STAGES } from "@/lib/ui/enums";
import { archiveOpportunityAction, changeStageAction } from "@/app/(app)/opportunities/actions";

export function StageChanger({
  id,
  stage,
  canEdit,
}: {
  id: string;
  stage: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit) return <StatusPill map={STAGE_STYLES} value={stage} />;

  function change(next: string) {
    setOpen(false);
    if (next === stage) return;
    startTransition(async () => {
      const res = await changeStageAction(id, next);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not change stage");
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <StatusPill map={STAGE_STYLES} value={stage} />
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div
          className="absolute left-0 z-20 mt-1 max-h-72 w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          role="listbox"
          onMouseLeave={() => setOpen(false)}
        >
          {STAGES.map((s) => (
            <button
              key={s.value}
              onClick={() => change(s.value)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              role="option"
              aria-selected={s.value === stage}
            >
              <StatusPill map={STAGE_STYLES} value={s.value} />
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ArchiveButton({ id, canArchive }: { id: string; canArchive: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!canArchive) return null;

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">Archive?</span>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await archiveOpportunityAction(id);
            })
          }
        >
          Confirm
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </span>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      <Archive className="h-4 w-4" /> Archive
    </Button>
  );
}
