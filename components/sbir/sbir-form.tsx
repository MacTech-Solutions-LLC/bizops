"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, Select, TextArea, TextInput } from "@/components/ui/form";
import { SBIR_PHASES, SBIR_PROGRAMS, STAGES } from "@/lib/ui/enums";
import { saveSbirTopicAction, type FormState } from "@/app/(app)/sbir/actions";

export interface SbirFormValues {
  id?: string;
  program?: string;
  component?: string | null;
  agencyId?: string | null;
  topicNumber?: string;
  topicTitle?: string;
  phase?: string;
  preReleaseDate?: string | null;
  openDate?: string | null;
  questionsDeadline?: string | null;
  closeDate?: string | null;
  technicalPoc?: string | null;
  contractingPoc?: string | null;
  objective?: string | null;
  description?: string | null;
  phaseIExpectations?: string | null;
  phaseIIExpectations?: string | null;
  phaseIIITransition?: string | null;
  trl?: number | null;
  deliverables?: string | null;
  awardRangeMin?: number | null;
  awardRangeMax?: number | null;
  periodOfPerformanceMonths?: number | null;
  eligibilityNotes?: string | null;
  dataRightsNotes?: string | null;
  requiredRegistrations?: string[];
  submissionPortal?: string | null;
  sourceUrl?: string | null;
  stage?: string;
}

function dateVal(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function SbirForm({
  values = {},
  agencies,
  mode,
}: {
  values?: SbirFormValues;
  agencies: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveSbirTopicAction, { ok: false });
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

      <FormSection title="Topic">
        <FormField label="Program" name="program">
          <Select name="program" options={SBIR_PROGRAMS} defaultValue={values.program ?? "SBIR"} />
        </FormField>
        <FormField label="Component / agency office" name="component">
          <TextInput name="component" defaultValue={values.component ?? ""} placeholder="AFWERX, DARPA, …" />
        </FormField>
        <FormField label="Agency" name="agencyId">
          <Select name="agencyId" options={agencyOptions} placeholder="— none —" defaultValue={values.agencyId ?? ""} />
        </FormField>
        <FormField label="Topic number" name="topicNumber" required error={err("topicNumber")}>
          <TextInput name="topicNumber" defaultValue={values.topicNumber ?? ""} required maxLength={120} />
        </FormField>
        <FormField label="Topic title" name="topicTitle" required error={err("topicTitle")} className="sm:col-span-2">
          <TextInput name="topicTitle" defaultValue={values.topicTitle ?? ""} required maxLength={400} />
        </FormField>
        <FormField label="Phase" name="phase">
          <Select name="phase" options={SBIR_PHASES} defaultValue={values.phase ?? "PHASE_I"} />
        </FormField>
        <FormField label="Stage" name="stage">
          <Select name="stage" options={STAGES} defaultValue={values.stage ?? "IDENTIFIED"} />
        </FormField>
        <FormField label="TRL" name="trl">
          <TextInput name="trl" type="number" min={1} max={9} defaultValue={values.trl ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Timeline & submission">
        <FormField label="Pre-release" name="preReleaseDate">
          <TextInput name="preReleaseDate" type="date" defaultValue={dateVal(values.preReleaseDate)} />
        </FormField>
        <FormField label="Open" name="openDate">
          <TextInput name="openDate" type="date" defaultValue={dateVal(values.openDate)} />
        </FormField>
        <FormField label="Questions due" name="questionsDeadline">
          <TextInput name="questionsDeadline" type="date" defaultValue={dateVal(values.questionsDeadline)} />
        </FormField>
        <FormField label="Close" name="closeDate">
          <TextInput name="closeDate" type="date" defaultValue={dateVal(values.closeDate)} />
        </FormField>
        <FormField label="Submission portal" name="submissionPortal">
          <TextInput name="submissionPortal" defaultValue={values.submissionPortal ?? ""} placeholder="DSIP" />
        </FormField>
        <FormField label="Source URL" name="sourceUrl" className="sm:col-span-2">
          <TextInput name="sourceUrl" type="url" defaultValue={values.sourceUrl ?? ""} />
        </FormField>
        <FormField label="Required registrations (comma separated)" name="requiredRegistrations" className="sm:col-span-2 lg:col-span-3">
          <TextInput name="requiredRegistrations" defaultValue={(values.requiredRegistrations ?? []).join(", ")} placeholder="SAM.gov, SBIR.gov, DSIP" />
        </FormField>
      </FormSection>

      <FormSection title="Award & points of contact">
        <FormField label="Award range min ($)" name="awardRangeMin">
          <TextInput name="awardRangeMin" type="number" step="1000" defaultValue={values.awardRangeMin ?? ""} />
        </FormField>
        <FormField label="Award range max ($)" name="awardRangeMax">
          <TextInput name="awardRangeMax" type="number" step="1000" defaultValue={values.awardRangeMax ?? ""} />
        </FormField>
        <FormField label="Period of performance (months)" name="periodOfPerformanceMonths">
          <TextInput name="periodOfPerformanceMonths" type="number" defaultValue={values.periodOfPerformanceMonths ?? ""} />
        </FormField>
        <FormField label="Technical POC" name="technicalPoc">
          <TextInput name="technicalPoc" defaultValue={values.technicalPoc ?? ""} />
        </FormField>
        <FormField label="Contracting POC" name="contractingPoc">
          <TextInput name="contractingPoc" defaultValue={values.contractingPoc ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title="Content">
        <FormField label="Objective" name="objective" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="objective" rows={2} defaultValue={values.objective ?? ""} />
        </FormField>
        <FormField label="Description" name="description" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="description" rows={3} defaultValue={values.description ?? ""} />
        </FormField>
        <FormField label="Phase I expectations" name="phaseIExpectations" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="phaseIExpectations" rows={2} defaultValue={values.phaseIExpectations ?? ""} />
        </FormField>
        <FormField label="Phase II expectations" name="phaseIIExpectations" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="phaseIIExpectations" rows={2} defaultValue={values.phaseIIExpectations ?? ""} />
        </FormField>
        <FormField label="Phase III transition" name="phaseIIITransition" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="phaseIIITransition" rows={2} defaultValue={values.phaseIIITransition ?? ""} />
        </FormField>
        <FormField label="Deliverables" name="deliverables" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="deliverables" rows={2} defaultValue={values.deliverables ?? ""} />
        </FormField>
        <FormField label="Eligibility notes" name="eligibilityNotes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="eligibilityNotes" rows={2} defaultValue={values.eligibilityNotes ?? ""} />
        </FormField>
        <FormField label="Data rights notes" name="dataRightsNotes" className="sm:col-span-2 lg:col-span-3">
          <TextArea name="dataRightsNotes" rows={2} defaultValue={values.dataRightsNotes ?? ""} />
        </FormField>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values.id ? `/sbir/${values.id}` : "/sbir"}>Cancel</Link>
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
      {pending ? "Saving…" : mode === "create" ? "Create topic" : "Save changes"}
    </Button>
  );
}
