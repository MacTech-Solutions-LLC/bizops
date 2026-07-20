"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { saveDirectoryOrganizationAction, type FormState } from "@/app/(app)/directory/actions";

export interface DirectoryOrganizationFormValues {
  id?: string;
  name?: string;
  orgType?: string | null;
  abbreviation?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  uei?: string | null;
  cageCode?: string | null;
  tags?: string[];
  notes?: string | null;
  status?: string | null;
}

const ORG_TYPES = [
  { value: "OTHER", label: "Other" },
  { value: "INTERNAL", label: "Internal (MacTech)" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "PRIME", label: "Prime" },
  { value: "SUBCONTRACTOR", label: "Subcontractor" },
  { value: "TEAMING_PARTNER", label: "Teaming partner" },
  { value: "VENDOR", label: "Vendor" },
  { value: "CONSULTANT", label: "Consultant" },
];
const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export function DirectoryOrganizationForm({
  values = {},
  mode,
}: {
  values?: DirectoryOrganizationFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveDirectoryOrganizationAction, { ok: false });
  const err = (field: string) => state.issues?.[field];

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
        <FormField label="Type" name="orgType">
          <Select name="orgType" options={ORG_TYPES} defaultValue={values.orgType ?? "OTHER"} />
        </FormField>
        <FormField label="Abbreviation" name="abbreviation">
          <TextInput name="abbreviation" defaultValue={values.abbreviation ?? ""} />
        </FormField>
        <FormField label="Website" name="website">
          <TextInput name="website" defaultValue={values.website ?? ""} placeholder="https://…" />
        </FormField>
        <FormField label="Email" name="email">
          <TextInput name="email" type="email" defaultValue={values.email ?? ""} />
        </FormField>
        <FormField label="Phone" name="phone">
          <TextInput name="phone" defaultValue={values.phone ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="GovCon identifiers">
        <FormField label="UEI" name="uei">
          <TextInput name="uei" defaultValue={values.uei ?? ""} />
        </FormField>
        <FormField label="CAGE code" name="cageCode">
          <TextInput name="cageCode" defaultValue={values.cageCode ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Address">
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
        <FormField label="Tags" name="tags" hint="Comma-separated.">
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
          <Link href={values.id ? `/directory/organizations/${values.id}` : "/directory"}>Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Add organization" : "Save changes"}
    </Button>
  );
}
