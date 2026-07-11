"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar, Field } from "@/components/ui/misc";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import { VOLUME_STATUS_STYLES } from "@/lib/ui/status";
import { formatDate } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { saveVolumeAction, type FormState } from "@/app/(app)/proposals/[id]/actions";

export interface PanelVolume {
  id: string;
  name: string;
  ownerId: string | null;
  reviewerId: string | null;
  status: string;
  dueAt: string | null;
  pageLimit: number | null;
  currentPages: number | null;
  outline: string | null;
  orderIndex: number;
  requirementCount: number;
}

const STATUS_OPTIONS = Object.entries(VOLUME_STATUS_STYLES).map(([value, s]) => ({
  value,
  label: s.label,
}));

export function VolumesPanel({
  proposalId,
  volumes,
  canManage,
}: {
  proposalId: string;
  volumes: PanelVolume[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding((a) => !a)}>
            <Plus className="h-4 w-4" /> Volume
          </Button>
        </div>
      ) : null}

      {canManage && adding ? (
        <VolumeForm proposalId={proposalId} onDone={() => setAdding(false)} />
      ) : null}

      {volumes.length === 0 && !adding ? (
        <p className="gc-card px-4 py-8 text-center text-sm text-slate-400">
          No volumes yet. Add one to start structuring the proposal.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {volumes.map((v) =>
            editId === v.id ? (
              <VolumeForm
                key={v.id}
                proposalId={proposalId}
                volume={v}
                onDone={() => setEditId(null)}
              />
            ) : (
              <article key={v.id} className="gc-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">{v.name}</h3>
                  <StatusPill map={VOLUME_STATUS_STYLES} value={v.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Owner">
                    {v.ownerId ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={v.ownerId} id={v.ownerId} size="sm" />
                        <span className="truncate text-xs">{v.ownerId}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </Field>
                  <Field label="Reviewer">
                    {v.reviewerId ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={v.reviewerId} id={v.reviewerId} size="sm" />
                        <span className="truncate text-xs">{v.reviewerId}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Field>
                  <Field label="Due">{formatDate(v.dueAt)}</Field>
                  <Field label="Requirements">{v.requirementCount}</Field>
                </dl>
                {v.pageLimit ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Pages</span>
                      <span className="tabular-nums">
                        {v.currentPages ?? 0}/{v.pageLimit}
                      </span>
                    </div>
                    <ProgressBar
                      value={v.currentPages ?? 0}
                      max={v.pageLimit}
                      className="mt-1"
                      barClassName={cn((v.currentPages ?? 0) > v.pageLimit && "bg-red-500")}
                      label={`${v.name} pages`}
                    />
                  </div>
                ) : null}
                {canManage ? (
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditId(v.id)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                ) : null}
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function dateVal(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

function VolumeForm({
  proposalId,
  volume,
  onDone,
}: {
  proposalId: string;
  volume?: PanelVolume;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveVolumeAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="gc-card space-y-3 p-4">
      <input type="hidden" name="proposalId" value={proposalId} />
      {volume ? <input type="hidden" name="volumeId" value={volume.id} /> : null}
      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Name" name="name" required error={err("name")} className="sm:col-span-2">
          <TextInput name="name" defaultValue={volume?.name ?? ""} required />
        </FormField>
        <FormField label="Owner (Hub user id)" name="ownerId">
          <TextInput name="ownerId" defaultValue={volume?.ownerId ?? ""} />
        </FormField>
        <FormField label="Reviewer (Hub user id)" name="reviewerId">
          <TextInput name="reviewerId" defaultValue={volume?.reviewerId ?? ""} />
        </FormField>
        <FormField label="Status" name="status">
          <Select name="status" options={STATUS_OPTIONS} defaultValue={volume?.status ?? "NOT_STARTED"} />
        </FormField>
        <FormField label="Due date" name="dueAt">
          <TextInput name="dueAt" type="date" defaultValue={dateVal(volume?.dueAt)} />
        </FormField>
        <FormField label="Page limit" name="pageLimit">
          <TextInput name="pageLimit" type="number" min={0} defaultValue={volume?.pageLimit ?? ""} />
        </FormField>
        <FormField label="Current pages" name="currentPages">
          <TextInput name="currentPages" type="number" min={0} defaultValue={volume?.currentPages ?? ""} />
        </FormField>
        <FormField label="Order" name="orderIndex">
          <TextInput name="orderIndex" type="number" min={0} defaultValue={volume?.orderIndex ?? 0} />
        </FormField>
        <FormField label="Outline" name="outline" className="sm:col-span-2">
          <TextArea name="outline" rows={2} defaultValue={volume?.outline ?? ""} />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <VolumeSubmit isEdit={Boolean(volume)} />
      </div>
    </form>
  );
}

function VolumeSubmit({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save volume" : "Add volume"}
    </Button>
  );
}
