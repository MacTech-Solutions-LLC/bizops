"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archivePartnerAction } from "@/app/(app)/partners/actions";

export function ArchivePartnerButton({ id, canArchive }: { id: string; canArchive: boolean }) {
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
          onClick={() => startTransition(async () => { await archivePartnerAction(id); })}
        >
          Confirm
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
      </span>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      <Archive className="h-4 w-4" /> Archive
    </Button>
  );
}
