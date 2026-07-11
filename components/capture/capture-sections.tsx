"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, Check, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, TextArea, TextInput } from "@/components/ui/form";
import {
  approveSectionAction,
  lockSectionAction,
  saveSectionAction,
  unlockSectionAction,
} from "@/app/(app)/opportunities/[id]/capture/actions";

export interface SectionRow {
  id: string;
  title: string;
  body: string | null;
  status: string;
  ownerId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  version: number;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-200",
  IN_REVIEW: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-teal-50 text-teal-700 ring-teal-200",
  LOCKED: "bg-violet-50 text-violet-700 ring-violet-200",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  LOCKED: "Locked",
};

export function CaptureSections({
  opportunityId,
  canEdit,
  sections,
}: {
  opportunityId: string;
  canEdit: boolean;
  sections: SectionRow[];
}) {
  return (
    <div className="divide-y divide-slate-100">
      {sections.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">
          No capture sections yet. Add one to structure the capture plan.
        </p>
      ) : (
        sections.map((s) => (
          <SectionItem key={s.id} opportunityId={opportunityId} canEdit={canEdit} section={s} />
        ))
      )}
      {canEdit ? <AddSection opportunityId={opportunityId} /> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function SectionItem({
  opportunityId,
  canEdit,
  section,
}: {
  opportunityId: string;
  canEdit: boolean;
  section: SectionRow;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isLocked = section.status === "LOCKED";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? "Action failed");
      }
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-800">{section.title}</h4>
            <StatusBadge status={section.status} />
          </div>
          {section.ownerId ? (
            <p className="mt-0.5 text-xs text-slate-400">Owner: {section.ownerId}</p>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1 print:hidden">
            {!isLocked ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setEditing((e) => !e)}
                  aria-label="Edit section"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {section.status !== "APPROVED" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => approveSectionAction(opportunityId, section.id))}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => lockSectionAction(opportunityId, section.id))}
                >
                  <Lock className="h-4 w-4" /> Lock
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => run(() => unlockSectionAction(opportunityId, section.id))}
              >
                <LockOpen className="h-4 w-4" /> Unlock
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <FormField label="Title" name={`title-${section.id}`}>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Body" name={`body-${section.id}`}>
            <TextArea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </FormField>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => saveSectionAction(opportunityId, section.id, { title, body }))
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : section.body ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{section.body}</p>
      ) : null}

      {isLocked ? (
        <p className="mt-2 text-xs text-slate-400">
          Locked. Unlock to edit content.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function AddSection({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveSectionAction(opportunityId, null, { title, body });
      if (res.ok) {
        setTitle("");
        setBody("");
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not add section");
      }
    });
  }

  if (!open) {
    return (
      <div className="px-4 py-3 print:hidden">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 py-3 print:hidden">
      <FormField label="Title" name="new-section-title" required>
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Win strategy" />
      </FormField>
      <FormField label="Body" name="new-section-body">
        <TextArea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </FormField>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending || !title.trim()} onClick={submit}>
          {pending ? "Adding…" : "Add section"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
