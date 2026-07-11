"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { READINESS_STATUSES } from "@/lib/ui/enums";
import { saveReadinessAction, type FormState } from "@/app/(app)/readiness/actions";

export interface ReadinessFormValues {
  id?: string;
  category?: string;
  name?: string;
  status?: string;
  ownerId?: string | null;
  issuer?: string | null;
  identifier?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  renewalDate?: string | null;
  evidenceLink?: string | null;
  reminderLeadDays?: number | null;
  notes?: string | null;
}

const CATEGORIES = [
  { value: "registration", label: "Registration" },
  { value: "certification", label: "Certification" },
  { value: "cyber", label: "Cyber" },
  { value: "clearance", label: "Clearance" },
  { value: "insurance", label: "Insurance" },
  { value: "vehicle", label: "Vehicle" },
];

function dateVal(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function ReadinessForm({
  values = {},
  mode,
}: {
  values?: ReadinessFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveReadinessAction, { ok: false });
  const err = (field: string) => state.issues?.[field];

  return (
    <form action={formAction} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}

      <FormSection title="Item">
        <FormField label="Category" name="category" required error={err("category")}>
          <Select name="category" options={CATEGORIES} defaultValue={values.category ?? "registration"} />
        </FormField>
        <FormField label="Name" name="name" required error={err("name")} className="sm:col-span-2">
          <TextInput name="name" defaultValue={values.name ?? ""} required maxLength={200} placeholder="SAM.gov, UEI, CMMC, NIST 800-171" />
        </FormField>
        <FormField label="Status" name="status">
          <Select name="status" options={READINESS_STATUSES} defaultValue={values.status ?? "NOT_STARTED"} />
        </FormField>
        <FormField label="Owner (Hub user id)" name="ownerId">
          <TextInput name="ownerId" defaultValue={values.ownerId ?? ""} />
        </FormField>
        <FormField label="Issuer" name="issuer">
          <TextInput name="issuer" defaultValue={values.issuer ?? ""} />
        </FormField>
        <FormField label="Identifier" name="identifier">
          <TextInput name="identifier" defaultValue={values.identifier ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Dates & evidence">
        <FormField label="Effective date" name="effectiveDate">
          <TextInput name="effectiveDate" type="date" defaultValue={dateVal(values.effectiveDate)} />
        </FormField>
        <FormField label="Expiration date" name="expirationDate">
          <TextInput name="expirationDate" type="date" defaultValue={dateVal(values.expirationDate)} />
        </FormField>
        <FormField label="Renewal date" name="renewalDate">
          <TextInput name="renewalDate" type="date" defaultValue={dateVal(values.renewalDate)} />
        </FormField>
        <FormField label="Reminder lead (days)" name="reminderLeadDays" hint="Days before expiry to flag as expiring soon.">
          <TextInput name="reminderLeadDays" type="number" defaultValue={values.reminderLeadDays ?? 30} />
        </FormField>
        <FormField label="Evidence link" name="evidenceLink" className="sm:col-span-2">
          <TextInput name="evidenceLink" type="url" defaultValue={values.evidenceLink ?? ""} />
        </FormField>
        <FormField label="Notes" name="notes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="notes" rows={2} defaultValue={values.notes ?? ""} />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href="/readiness">Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Add item" : "Save changes"}
    </Button>
  );
}
