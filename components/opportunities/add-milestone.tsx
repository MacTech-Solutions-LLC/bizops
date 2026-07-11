"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Select, TextInput } from "@/components/ui/form";
import { MILESTONE_TYPES } from "@/lib/ui/enums";
import { createMilestoneAction, type FormState } from "@/app/(app)/opportunities/[id]/milestone-actions";

export function AddMilestone({
  opportunityId,
  canEdit,
}: {
  opportunityId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<FormState, FormData>(createMilestoneAction, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  if (!canEdit) return null;

  if (!open) {
    return (
      <div className="px-4 py-3">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add milestone
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3 border-b border-slate-100 px-4 py-3">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <FormField label="Title" name="title" required error={state.issues?.title}>
        <TextInput name="title" required maxLength={300} placeholder="e.g. Pink Team review" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Type" name="type">
          <Select name="type" options={MILESTONE_TYPES} defaultValue="OTHER" />
        </FormField>
        <FormField label="Due" name="dueAt">
          <TextInput name="dueAt" type="date" />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Adding…" : "Add milestone"}
    </Button>
  );
}
