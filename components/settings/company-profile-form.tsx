"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/ui/form";
import { saveCompanyProfileAction, type SettingsFormState } from "@/app/(app)/settings/actions";

export function CompanyProfileForm({
  values,
  canEdit,
}: {
  values: { legalName?: string; dba?: string | null; cageCode?: string | null; uei?: string | null; naicsPrimary?: string | null };
  canEdit: boolean;
}) {
  const [state, action] = useFormState<SettingsFormState, FormData>(saveCompanyProfileAction, { ok: false });
  return (
    <form action={action} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
      {state.error ? <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="sm:col-span-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p> : null}
      <FormField label="Legal name" name="legalName" required error={state.issues?.legalName} className="sm:col-span-2">
        <TextInput name="legalName" defaultValue={values.legalName ?? ""} required disabled={!canEdit} />
      </FormField>
      <FormField label="DBA" name="dba">
        <TextInput name="dba" defaultValue={values.dba ?? ""} disabled={!canEdit} />
      </FormField>
      <FormField label="CAGE code" name="cageCode">
        <TextInput name="cageCode" defaultValue={values.cageCode ?? ""} disabled={!canEdit} />
      </FormField>
      <FormField label="UEI" name="uei">
        <TextInput name="uei" defaultValue={values.uei ?? ""} disabled={!canEdit} />
      </FormField>
      <FormField label="Primary NAICS" name="naicsPrimary">
        <TextInput name="naicsPrimary" defaultValue={values.naicsPrimary ?? ""} disabled={!canEdit} />
      </FormField>
      {canEdit && (
        <div className="sm:col-span-2">
          <Submit />
        </div>
      )}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>;
}
