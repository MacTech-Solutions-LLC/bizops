"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { VOLUME_STATUS_STYLES } from "@/lib/ui/status";
import { saveProposalAction, type FormState } from "@/app/(app)/proposals/actions";

const STATUS_OPTIONS = Object.entries(VOLUME_STATUS_STYLES).map(([value, s]) => ({
  value,
  label: s.label,
}));

export interface ProposalFormValues {
  id?: string;
  version?: number;
  opportunityId?: string;
  title?: string;
  managerId?: string | null;
  dueAt?: string | null;
  status?: string;
  notes?: string | null;
}

function dateVal(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function ProposalForm({
  values = {},
  opportunities,
  mode,
}: {
  values?: ProposalFormValues;
  opportunities: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveProposalAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  const oppOptions = opportunities.map((o) => ({ value: o.id, label: o.name }));

  return (
    <form action={formAction} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {values.version !== undefined ? (
        <input type="hidden" name="expectedVersion" value={values.version} />
      ) : null}

      {state.error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <FormSection title="Proposal">
        {mode === "create" ? (
          <FormField
            label="Pursuit"
            name="opportunityId"
            required
            error={err("opportunityId")}
            className="sm:col-span-2"
          >
            <Select
              name="opportunityId"
              options={oppOptions}
              placeholder="— select a pursuit —"
              defaultValue={values.opportunityId ?? ""}
              required
            />
          </FormField>
        ) : null}
        <FormField
          label="Title"
          name="title"
          required
          error={err("title")}
          className="sm:col-span-2 lg:col-span-3"
        >
          <TextInput name="title" defaultValue={values.title ?? ""} required maxLength={300} />
        </FormField>
        <FormField label="Proposal manager (Hub user id)" name="managerId">
          <TextInput name="managerId" defaultValue={values.managerId ?? ""} />
        </FormField>
        <FormField label="Due date" name="dueAt">
          <TextInput name="dueAt" type="date" defaultValue={dateVal(values.dueAt)} />
        </FormField>
        <FormField label="Status" name="status">
          <Select
            name="status"
            options={STATUS_OPTIONS}
            defaultValue={values.status ?? "NOT_STARTED"}
          />
        </FormField>
        <FormField label="Notes" name="notes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="notes" rows={2} defaultValue={values.notes ?? ""} />
        </FormField>
        {mode === "create" ? (
          <FormField label="Volumes" name="seedVolumes" className="sm:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="seedVolumes" value="true" defaultChecked />
              Seed the standard volume set (Executive Summary, Technical, Management, Past
              Performance, Staffing, Pricing, Reps &amp; Certs)
            </label>
          </FormField>
        ) : null}
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values.id ? `/proposals/${values.id}` : "/proposals"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : mode === "create" ? "Create proposal" : "Save changes"}
    </Button>
  );
}
