"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { saveContactAction, type FormState } from "@/app/(app)/contacts/actions";

export interface ContactFormValues {
  id?: string;
  name?: string;
  title?: string | null;
  organizationName?: string | null;
  agencyId?: string | null;
  officeId?: string | null;
  email?: string | null;
  phone?: string | null;
  contactType?: string | null;
  acquisitionRole?: string | null;
  decisionRole?: string | null;
  influence?: string | null;
  relationshipStrength?: string | null;
  nextActionAt?: string | null;
  nextAction?: string | null;
  meetingNotes?: string | null;
  sensitivityNotes?: string | null;
}

const INFLUENCE = [
  { value: "", label: "— unset —" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const STRENGTH = [
  { value: "", label: "— unset —" },
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "weak", label: "Weak" },
  { value: "none", label: "None" },
];

function dateVal(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function ContactForm({
  values = {},
  agencies,
  mode,
}: {
  values?: ContactFormValues;
  agencies: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveContactAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  const agencyOptions = agencies.map((a) => ({ value: a.id, label: a.name.replace("[DEMO] ", "") }));

  return (
    <form action={formAction} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}

      <FormSection title="Identity">
        <FormField label="Name" name="name" required error={err("name")}>
          <TextInput name="name" defaultValue={values.name ?? ""} required maxLength={200} />
        </FormField>
        <FormField label="Title" name="title">
          <TextInput name="title" defaultValue={values.title ?? ""} />
        </FormField>
        <FormField label="Organization" name="organizationName">
          <TextInput name="organizationName" defaultValue={values.organizationName ?? ""} />
        </FormField>
        <FormField label="Agency" name="agencyId">
          <Select name="agencyId" options={agencyOptions} placeholder="— none —" defaultValue={values.agencyId ?? ""} />
        </FormField>
        <FormField label="Email" name="email">
          <TextInput name="email" type="email" defaultValue={values.email ?? ""} />
        </FormField>
        <FormField label="Phone" name="phone">
          <TextInput name="phone" defaultValue={values.phone ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Role & relationship">
        <FormField label="Contact type" name="contactType">
          <TextInput name="contactType" defaultValue={values.contactType ?? ""} placeholder="government, teaming, industry, internal" />
        </FormField>
        <FormField label="Acquisition role" name="acquisitionRole">
          <TextInput name="acquisitionRole" defaultValue={values.acquisitionRole ?? ""} placeholder="CO, COR, PM, technical" />
        </FormField>
        <FormField label="Decision role" name="decisionRole">
          <TextInput name="decisionRole" defaultValue={values.decisionRole ?? ""} placeholder="decision-maker, influencer, gatekeeper" />
        </FormField>
        <FormField label="Influence" name="influence">
          <Select name="influence" options={INFLUENCE} defaultValue={values.influence ?? ""} />
        </FormField>
        <FormField label="Relationship strength" name="relationshipStrength">
          <Select name="relationshipStrength" options={STRENGTH} defaultValue={values.relationshipStrength ?? ""} />
        </FormField>
        <FormField label="Next action" name="nextAction">
          <TextInput name="nextAction" defaultValue={values.nextAction ?? ""} />
        </FormField>
        <FormField label="Next action date" name="nextActionAt">
          <TextInput name="nextActionAt" type="date" defaultValue={dateVal(values.nextActionAt)} />
        </FormField>
      </FormSection>

      <FormSection title="Notes">
        <FormField label="Meeting notes" name="meetingNotes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="meetingNotes" rows={3} defaultValue={values.meetingNotes ?? ""} />
        </FormField>
        <FormField label="Sensitivity notes" name="sensitivityNotes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="sensitivityNotes" rows={2} defaultValue={values.sensitivityNotes ?? ""} />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values.id ? `/contacts/${values.id}` : "/contacts"}>Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Add contact" : "Save changes"}
    </Button>
  );
}
