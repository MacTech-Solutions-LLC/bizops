"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { VEHICLE_STATUSES } from "@/lib/ui/enums";
import { saveVehicleAction, type FormState } from "@/app/(app)/vehicles/actions";

export interface VehicleFormValues {
  id?: string;
  name?: string;
  vehicleType?: string | null;
  agency?: string | null;
  contractNumber?: string | null;
  primeHolder?: string | null;
  subcontractAccess?: boolean;
  pools?: string[];
  naicsCodes?: string[];
  startDate?: string | null;
  endDate?: string | null;
  optionPeriods?: number | null;
  ceiling?: number | null;
  orderingStatus?: string | null;
  status?: string;
  renewalActions?: string | null;
  notes?: string | null;
}

function dateVal(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function VehicleForm({
  values = {},
  mode,
}: {
  values?: VehicleFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveVehicleAction, { ok: false });
  const err = (field: string) => state.issues?.[field];

  return (
    <form action={formAction} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}

      <FormSection title="Vehicle">
        <FormField label="Name" name="name" required error={err("name")} className="sm:col-span-2">
          <TextInput name="name" defaultValue={values.name ?? ""} required maxLength={300} />
        </FormField>
        <FormField label="Type" name="vehicleType">
          <TextInput name="vehicleType" defaultValue={values.vehicleType ?? ""} placeholder="IDIQ, GWAC, BPA, GSA Schedule, OTA" />
        </FormField>
        <FormField label="Agency" name="agency">
          <TextInput name="agency" defaultValue={values.agency ?? ""} />
        </FormField>
        <FormField label="Contract number" name="contractNumber">
          <TextInput name="contractNumber" defaultValue={values.contractNumber ?? ""} />
        </FormField>
        <FormField label="Prime holder" name="primeHolder">
          <TextInput name="primeHolder" defaultValue={values.primeHolder ?? ""} />
        </FormField>
        <FormField label="Status" name="status">
          <Select name="status" options={VEHICLE_STATUSES} defaultValue={values.status ?? "PURSUING"} />
        </FormField>
        <FormField label="Ordering status" name="orderingStatus">
          <TextInput name="orderingStatus" defaultValue={values.orderingStatus ?? ""} placeholder="On-ramp open, closed" />
        </FormField>
        <FormField label="Subcontract access" name="subcontractAccess">
          <label className="flex h-9 items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="subcontractAccess" defaultChecked={values.subcontractAccess ?? false} />
            Available via subcontract
          </label>
        </FormField>
      </FormSection>

      <FormSection title="Scope & terms">
        <FormField label="Pools (comma separated)" name="pools" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="pools" defaultValue={(values.pools ?? []).join(", ")} />
        </FormField>
        <FormField label="NAICS codes (comma separated)" name="naicsCodes" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="naicsCodes" defaultValue={(values.naicsCodes ?? []).join(", ")} />
        </FormField>
        <FormField label="Ceiling ($)" name="ceiling">
          <TextInput name="ceiling" type="number" step="1000" defaultValue={values.ceiling ?? ""} />
        </FormField>
        <FormField label="Option periods" name="optionPeriods">
          <TextInput name="optionPeriods" type="number" defaultValue={values.optionPeriods ?? ""} />
        </FormField>
        <FormField label="Start date" name="startDate">
          <TextInput name="startDate" type="date" defaultValue={dateVal(values.startDate)} />
        </FormField>
        <FormField label="End date" name="endDate">
          <TextInput name="endDate" type="date" defaultValue={dateVal(values.endDate)} />
        </FormField>
        <FormField label="Renewal actions" name="renewalActions" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="renewalActions" rows={2} defaultValue={values.renewalActions ?? ""} />
        </FormField>
        <FormField label="Notes" name="notes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="notes" rows={2} defaultValue={values.notes ?? ""} />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values.id ? `/vehicles/${values.id}` : "/vehicles"}>Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Add vehicle" : "Save changes"}
    </Button>
  );
}
