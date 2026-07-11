"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { PRIORITIES, TASK_STATUSES, type Option } from "@/lib/ui/enums";
import { saveTaskAction, type FormState } from "@/app/(app)/tasks/actions";

export function TaskForm({
  opportunities,
}: {
  opportunities: Array<{ id: string; internalName: string }>;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveTaskAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  const opportunityOptions: Option[] = opportunities.map((o) => ({
    value: o.id,
    label: o.internalName.replace("[DEMO] ", ""),
  }));

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}

      <FormSection title="Task">
        <FormField label="Title" name="title" required error={err("title")} className="sm:col-span-2 lg:col-span-3">
          <TextInput name="title" required maxLength={300} placeholder="e.g. Draft technical volume outline" />
        </FormField>
        <FormField label="Description" name="description" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="description" rows={3} />
        </FormField>
        <FormField label="Pursuit" name="opportunityId" className="sm:col-span-2">
          <Select name="opportunityId" options={opportunityOptions} placeholder="— none —" defaultValue="" />
        </FormField>
        <FormField label="Assignee (Hub user id)" name="assigneeId">
          <TextInput name="assigneeId" placeholder="hub user id" />
        </FormField>
        <FormField label="Priority" name="priority">
          <Select name="priority" options={PRIORITIES} defaultValue="MEDIUM" />
        </FormField>
        <FormField label="Status" name="status">
          <Select name="status" options={TASK_STATUSES} defaultValue="TODO" />
        </FormField>
        <FormField label="Due date" name="dueAt">
          <TextInput name="dueAt" type="date" />
        </FormField>
        <FormField label="Tags" name="tags" hint="Comma-separated" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="tags" placeholder="pricing, compliance" />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href="/tasks">Cancel</Link>
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Create task"}
    </Button>
  );
}
