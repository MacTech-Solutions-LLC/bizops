"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import {
  COMPETITION_TYPES,
  HEALTHS,
  OPPORTUNITY_TYPES,
  PRIORITIES,
  STAGES,
  TEAM_ROLES,
} from "@/lib/ui/enums";
import { saveOpportunityAction, type FormState } from "@/app/(app)/opportunities/actions";

export interface OpportunityFormValues {
  id?: string;
  version?: number;
  internalName?: string;
  solicitationTitle?: string | null;
  solicitationNumber?: string | null;
  noticeId?: string | null;
  type?: string;
  sourceSystem?: string | null;
  sourceUrl?: string | null;
  agencyId?: string | null;
  subAgency?: string | null;
  contractingOffice?: string | null;
  placeOfPerformance?: string | null;
  setAside?: string | null;
  naics?: string | null;
  psc?: string | null;
  vehicleId?: string | null;
  contractType?: string | null;
  competitionType?: string;
  estimatedValue?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  ceiling?: number | null;
  fundedValue?: number | null;
  periodOfPerformanceMonths?: number | null;
  postedDate?: string | null;
  responseDeadline?: string | null;
  questionsDeadline?: string | null;
  proposalDeadline?: string | null;
  expectedAwardDate?: string | null;
  stage?: string;
  health?: string;
  priority?: string;
  strategicFit?: number | null;
  pWin?: number | null;
  pGo?: number | null;
  teamRole?: string;
  incumbent?: string | null;
  captureOwnerId?: string | null;
  proposalManagerId?: string | null;
  executiveSponsorId?: string | null;
  nextAction?: string | null;
  winThemes?: string | null;
  discriminators?: string | null;
  customerHotButtons?: string | null;
}

function dateVal(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function OpportunityForm({
  values = {},
  agencies,
  vehicles,
  mode,
}: {
  values?: OpportunityFormValues;
  agencies: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveOpportunityAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  const agencyOptions = agencies.map((a) => ({ value: a.id, label: a.name.replace("[DEMO] ", "") }));
  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: v.name.replace("[DEMO] ", "") }));

  return (
    <form action={formAction} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {values.version !== undefined ? (
        <input type="hidden" name="expectedVersion" value={values.version} />
      ) : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}

      <FormSection title="Identity">
        <FormField label="Internal name" name="internalName" required error={err("internalName")} className="sm:col-span-2 lg:col-span-3">
          <TextInput name="internalName" defaultValue={values.internalName ?? ""} required maxLength={300} />
        </FormField>
        <FormField label="Solicitation title" name="solicitationTitle" className="sm:col-span-2">
          <TextInput name="solicitationTitle" defaultValue={values.solicitationTitle ?? ""} />
        </FormField>
        <FormField label="Solicitation #" name="solicitationNumber">
          <TextInput name="solicitationNumber" defaultValue={values.solicitationNumber ?? ""} />
        </FormField>
        <FormField label="Notice ID" name="noticeId">
          <TextInput name="noticeId" defaultValue={values.noticeId ?? ""} />
        </FormField>
        <FormField label="Type" name="type">
          <Select name="type" options={OPPORTUNITY_TYPES} defaultValue={values.type ?? "RFP"} />
        </FormField>
        <FormField label="Source system" name="sourceSystem">
          <TextInput name="sourceSystem" defaultValue={values.sourceSystem ?? ""} placeholder="SAM.gov" />
        </FormField>
        <FormField label="Source URL" name="sourceUrl" className="sm:col-span-2">
          <TextInput name="sourceUrl" type="url" defaultValue={values.sourceUrl ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Customer & Contract">
        <FormField label="Agency" name="agencyId">
          <Select name="agencyId" options={agencyOptions} placeholder="— none —" defaultValue={values.agencyId ?? ""} />
        </FormField>
        <FormField label="Sub-agency" name="subAgency">
          <TextInput name="subAgency" defaultValue={values.subAgency ?? ""} />
        </FormField>
        <FormField label="Contracting office" name="contractingOffice">
          <TextInput name="contractingOffice" defaultValue={values.contractingOffice ?? ""} />
        </FormField>
        <FormField label="Place of performance" name="placeOfPerformance">
          <TextInput name="placeOfPerformance" defaultValue={values.placeOfPerformance ?? ""} />
        </FormField>
        <FormField label="Set-aside" name="setAside">
          <TextInput name="setAside" defaultValue={values.setAside ?? ""} />
        </FormField>
        <FormField label="Competition" name="competitionType">
          <Select name="competitionType" options={COMPETITION_TYPES} defaultValue={values.competitionType ?? "UNKNOWN"} />
        </FormField>
        <FormField label="NAICS" name="naics">
          <TextInput name="naics" defaultValue={values.naics ?? ""} />
        </FormField>
        <FormField label="PSC" name="psc">
          <TextInput name="psc" defaultValue={values.psc ?? ""} />
        </FormField>
        <FormField label="Contract type" name="contractType">
          <TextInput name="contractType" defaultValue={values.contractType ?? ""} placeholder="FFP, T&M, CPFF" />
        </FormField>
        <FormField label="Contract vehicle" name="vehicleId">
          <Select name="vehicleId" options={vehicleOptions} placeholder="— none —" defaultValue={values.vehicleId ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Commercial">
        <FormField label="Estimated value ($)" name="estimatedValue" error={err("estimatedValue")}>
          <TextInput name="estimatedValue" type="number" step="1000" defaultValue={values.estimatedValue ?? ""} />
        </FormField>
        <FormField label="Ceiling ($)" name="ceiling">
          <TextInput name="ceiling" type="number" step="1000" defaultValue={values.ceiling ?? ""} />
        </FormField>
        <FormField label="Funded value ($)" name="fundedValue">
          <TextInput name="fundedValue" type="number" step="1000" defaultValue={values.fundedValue ?? ""} />
        </FormField>
        <FormField label="Period of performance (months)" name="periodOfPerformanceMonths">
          <TextInput name="periodOfPerformanceMonths" type="number" defaultValue={values.periodOfPerformanceMonths ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Key dates">
        <FormField label="Posted" name="postedDate">
          <TextInput name="postedDate" type="date" defaultValue={dateVal(values.postedDate)} />
        </FormField>
        <FormField label="Questions due" name="questionsDeadline">
          <TextInput name="questionsDeadline" type="date" defaultValue={dateVal(values.questionsDeadline)} />
        </FormField>
        <FormField label="Proposal deadline" name="proposalDeadline">
          <TextInput name="proposalDeadline" type="date" defaultValue={dateVal(values.proposalDeadline)} />
        </FormField>
        <FormField label="Response deadline" name="responseDeadline">
          <TextInput name="responseDeadline" type="date" defaultValue={dateVal(values.responseDeadline)} />
        </FormField>
        <FormField label="Expected award" name="expectedAwardDate">
          <TextInput name="expectedAwardDate" type="date" defaultValue={dateVal(values.expectedAwardDate)} />
        </FormField>
      </FormSection>

      <FormSection title="Pursuit">
        <FormField label="Stage" name="stage">
          <Select name="stage" options={STAGES} defaultValue={values.stage ?? "IDENTIFIED"} />
        </FormField>
        <FormField label="Health" name="health">
          <Select name="health" options={HEALTHS} defaultValue={values.health ?? "UNKNOWN"} />
        </FormField>
        <FormField label="Priority" name="priority">
          <Select name="priority" options={PRIORITIES} defaultValue={values.priority ?? "MEDIUM"} />
        </FormField>
        <FormField label="Prime / Sub" name="teamRole">
          <Select name="teamRole" options={TEAM_ROLES} defaultValue={values.teamRole ?? "UNDECIDED"} />
        </FormField>
        <FormField label="PWin (%)" name="pWin" error={err("pWin")}>
          <TextInput name="pWin" type="number" min={0} max={100} defaultValue={values.pWin ?? ""} />
        </FormField>
        <FormField label="PGo (%)" name="pGo">
          <TextInput name="pGo" type="number" min={0} max={100} defaultValue={values.pGo ?? ""} />
        </FormField>
        <FormField label="Strategic fit (%)" name="strategicFit">
          <TextInput name="strategicFit" type="number" min={0} max={100} defaultValue={values.strategicFit ?? ""} />
        </FormField>
        <FormField label="Incumbent" name="incumbent">
          <TextInput name="incumbent" defaultValue={values.incumbent ?? ""} />
        </FormField>
        <FormField label="Capture owner (Hub user id)" name="captureOwnerId">
          <TextInput name="captureOwnerId" defaultValue={values.captureOwnerId ?? ""} />
        </FormField>
        <FormField label="Proposal manager (Hub user id)" name="proposalManagerId">
          <TextInput name="proposalManagerId" defaultValue={values.proposalManagerId ?? ""} />
        </FormField>
        <FormField label="Executive sponsor (Hub user id)" name="executiveSponsorId">
          <TextInput name="executiveSponsorId" defaultValue={values.executiveSponsorId ?? ""} />
        </FormField>
        <FormField label="Next action" name="nextAction" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="nextAction" defaultValue={values.nextAction ?? ""} />
        </FormField>
        <FormField label="Win themes" name="winThemes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="winThemes" rows={2} defaultValue={values.winThemes ?? ""} />
        </FormField>
        <FormField label="Discriminators" name="discriminators" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="discriminators" rows={2} defaultValue={values.discriminators ?? ""} />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values.id ? `/opportunities/${values.id}` : "/opportunities"}>Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Create opportunity" : "Save changes"}
    </Button>
  );
}
