"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { saveDirectoryContactAction, type FormState } from "@/app/(app)/directory/actions";

export interface DirectoryContactFormValues {
  id?: string;
  name?: string;
  kind?: string | null;
  title?: string | null;
  department?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  linkedinUrl?: string | null;
  tags?: string[];
  notes?: string | null;
  status?: string | null;
}

const KINDS = [
  { value: "EXTERNAL", label: "External" },
  { value: "INTERNAL", label: "Internal" },
];
const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export function DirectoryContactForm({
  values = {},
  organizations,
  mode,
}: {
  values?: DirectoryContactFormValues;
  organizations: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveDirectoryContactAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  const orgOptions = organizations.map((o) => ({ value: o.id, label: o.name }));

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
        <FormField label="Kind" name="kind" hint="Internal teammate or external contact.">
          <Select name="kind" options={KINDS} defaultValue={values.kind ?? "EXTERNAL"} />
        </FormField>
        <FormField label="Title" name="title">
          <TextInput name="title" defaultValue={values.title ?? ""} />
        </FormField>
        <FormField label="Department" name="department">
          <TextInput name="department" defaultValue={values.department ?? ""} />
        </FormField>
        <FormField label="Organization" name="organizationId" error={err("organizationId")}>
          <Select name="organizationId" options={orgOptions} placeholder="— none —" defaultValue={values.organizationId ?? ""} />
        </FormField>
        <FormField label="Organization (free text)" name="organizationName" hint="Used when not linked to a directory organization.">
          <TextInput name="organizationName" defaultValue={values.organizationName ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Reach">
        <FormField label="Email" name="email">
          <TextInput name="email" type="email" defaultValue={values.email ?? ""} />
        </FormField>
        <FormField label="Phone" name="phone">
          <TextInput name="phone" defaultValue={values.phone ?? ""} />
        </FormField>
        <FormField label="Mobile" name="mobile">
          <TextInput name="mobile" defaultValue={values.mobile ?? ""} />
        </FormField>
        <FormField label="LinkedIn" name="linkedinUrl">
          <TextInput name="linkedinUrl" defaultValue={values.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/…" />
        </FormField>
        <FormField label="Address line 1" name="addressLine1">
          <TextInput name="addressLine1" defaultValue={values.addressLine1 ?? ""} />
        </FormField>
        <FormField label="Address line 2" name="addressLine2">
          <TextInput name="addressLine2" defaultValue={values.addressLine2 ?? ""} />
        </FormField>
        <FormField label="City" name="city">
          <TextInput name="city" defaultValue={values.city ?? ""} />
        </FormField>
        <FormField label="State" name="state">
          <TextInput name="state" defaultValue={values.state ?? ""} />
        </FormField>
        <FormField label="Postal code" name="postalCode">
          <TextInput name="postalCode" defaultValue={values.postalCode ?? ""} />
        </FormField>
        <FormField label="Country" name="country">
          <TextInput name="country" defaultValue={values.country ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Classification">
        <FormField label="Tags" name="tags" hint="Comma-separated, e.g. contracting, ko, small-business.">
          <TextInput name="tags" defaultValue={(values.tags ?? []).join(", ")} />
        </FormField>
        <FormField label="Status" name="status">
          <Select name="status" options={STATUSES} defaultValue={values.status ?? "ACTIVE"} />
        </FormField>
        <FormField label="Notes" name="notes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="notes" rows={3} defaultValue={values.notes ?? ""} />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values.id ? `/directory/${values.id}` : "/directory"}>Cancel</Link>
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
