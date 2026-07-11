"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { AGREEMENT_STATUSES, BUSINESS_SIZES } from "@/lib/ui/enums";
import { savePartnerAction, type FormState } from "@/app/(app)/partners/actions";

export interface PartnerFormValues {
  id?: string;
  legalName?: string;
  dba?: string | null;
  uei?: string | null;
  cageCode?: string | null;
  businessSize?: string;
  socioeconomicStatus?: string[];
  naicsCapabilities?: string[];
  contractVehicles?: string[];
  facilityClearance?: string | null;
  keyCapabilities?: string | null;
  pastPerformance?: string | null;
  relationshipOwner?: string | null;
  proposedRole?: string | null;
  ndaStatus?: string;
  teamingStatus?: string;
  subcontractStatus?: string;
  risk?: string | null;
  notes?: string | null;
}

export function PartnerForm({
  values = {},
  mode,
}: {
  values?: PartnerFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(savePartnerAction, { ok: false });
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
        <FormField label="Legal name" name="legalName" required error={err("legalName")} className="sm:col-span-2">
          <TextInput name="legalName" defaultValue={values.legalName ?? ""} required maxLength={300} />
        </FormField>
        <FormField label="DBA" name="dba">
          <TextInput name="dba" defaultValue={values.dba ?? ""} />
        </FormField>
        <FormField label="UEI" name="uei">
          <TextInput name="uei" defaultValue={values.uei ?? ""} />
        </FormField>
        <FormField label="CAGE code" name="cageCode">
          <TextInput name="cageCode" defaultValue={values.cageCode ?? ""} />
        </FormField>
        <FormField label="Business size" name="businessSize">
          <Select name="businessSize" options={BUSINESS_SIZES} defaultValue={values.businessSize ?? "UNKNOWN"} />
        </FormField>
        <FormField label="Relationship owner (Hub user id)" name="relationshipOwner">
          <TextInput name="relationshipOwner" defaultValue={values.relationshipOwner ?? ""} />
        </FormField>
        <FormField label="Risk" name="risk">
          <TextInput name="risk" defaultValue={values.risk ?? ""} placeholder="low, medium, high" />
        </FormField>
      </FormSection>

      <FormSection title="Capabilities">
        <FormField label="Socioeconomic status (comma separated)" name="socioeconomicStatus" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="socioeconomicStatus" defaultValue={(values.socioeconomicStatus ?? []).join(", ")} placeholder="8(a), SDVOSB, WOSB, HUBZone" />
        </FormField>
        <FormField label="NAICS capabilities (comma separated)" name="naicsCapabilities" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="naicsCapabilities" defaultValue={(values.naicsCapabilities ?? []).join(", ")} placeholder="541512, 541519" />
        </FormField>
        <FormField label="Contract vehicles (comma separated)" name="contractVehicles" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="contractVehicles" defaultValue={(values.contractVehicles ?? []).join(", ")} placeholder="GSA MAS, OASIS+" />
        </FormField>
        <FormField label="Facility clearance" name="facilityClearance">
          <TextInput name="facilityClearance" defaultValue={values.facilityClearance ?? ""} placeholder="Secret, Top Secret" />
        </FormField>
        <FormField label="Proposed role" name="proposedRole">
          <TextInput name="proposedRole" defaultValue={values.proposedRole ?? ""} />
        </FormField>
        <FormField label="Key capabilities" name="keyCapabilities" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="keyCapabilities" rows={2} defaultValue={values.keyCapabilities ?? ""} />
        </FormField>
        <FormField label="Past performance" name="pastPerformance" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="pastPerformance" rows={2} defaultValue={values.pastPerformance ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Agreements">
        <FormField label="NDA status" name="ndaStatus">
          <Select name="ndaStatus" options={AGREEMENT_STATUSES} defaultValue={values.ndaStatus ?? "NONE"} />
        </FormField>
        <FormField label="Teaming status" name="teamingStatus">
          <Select name="teamingStatus" options={AGREEMENT_STATUSES} defaultValue={values.teamingStatus ?? "NONE"} />
        </FormField>
        <FormField label="Subcontract status" name="subcontractStatus">
          <Select name="subcontractStatus" options={AGREEMENT_STATUSES} defaultValue={values.subcontractStatus ?? "NONE"} />
        </FormField>
        <FormField label="Notes" name="notes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="notes" rows={2} defaultValue={values.notes ?? ""} />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values.id ? `/partners/${values.id}` : "/partners"}>Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Add partner" : "Save changes"}
    </Button>
  );
}
