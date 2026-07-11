"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FormField, FormSection, TextArea, TextInput } from "@/components/ui/form";
import { saveCaptureAction, type FormState } from "@/app/(app)/opportunities/[id]/capture/actions";

export interface CapturePlanValues {
  version?: number;
  ownerId?: string | null;
  customerMission?: string | null;
  customerProblem?: string | null;
  acquisitionContext?: string | null;
  procurementHistory?: string | null;
  incumbentAnalysis?: string | null;
  competitiveLandscape?: string | null;
  stakeholderMap?: string | null;
  relationshipMap?: string | null;
  decisionRoles?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  competitorStrengths?: string | null;
  competitorWeaknesses?: string | null;
  discriminators?: string | null;
  winThemes?: string | null;
  ghostThemes?: string | null;
  proofPoints?: string | null;
  pastPerformanceAlignment?: string | null;
  teamingGaps?: string | null;
  staffingGaps?: string | null;
  technicalGaps?: string | null;
  readinessGaps?: string | null;
  pricingPosture?: string | null;
  captureActions?: string | null;
}

const WIDE = "sm:col-span-2 lg:col-span-3";

export function CaptureForm({
  opportunityId,
  canEdit,
  values = {},
}: {
  opportunityId: string;
  canEdit: boolean;
  values?: CapturePlanValues;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveCaptureAction, { ok: false });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      {values.version !== undefined ? (
        <input type="hidden" name="expectedVersion" value={values.version} />
      ) : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
          Capture plan saved.
        </div>
      ) : null}

      <fieldset disabled={!canEdit} className="space-y-4">
        <FormSection title="Customer & acquisition">
          <Area label="Customer mission" name="customerMission" value={values.customerMission} />
          <Area label="Customer problem" name="customerProblem" value={values.customerProblem} />
          <Area label="Acquisition context" name="acquisitionContext" value={values.acquisitionContext} />
          <Area label="Procurement history" name="procurementHistory" value={values.procurementHistory} />
          <Area label="Incumbent analysis" name="incumbentAnalysis" value={values.incumbentAnalysis} />
          <Area label="Competitive landscape" name="competitiveLandscape" value={values.competitiveLandscape} />
        </FormSection>

        <FormSection title="Stakeholders & relationships">
          <Area label="Stakeholder map" name="stakeholderMap" value={values.stakeholderMap} />
          <Area label="Relationship map" name="relationshipMap" value={values.relationshipMap} />
          <Area label="Decision roles" name="decisionRoles" value={values.decisionRoles} />
        </FormSection>

        <FormSection title="Competitive position">
          <Area label="Our strengths" name="strengths" value={values.strengths} />
          <Area label="Our weaknesses" name="weaknesses" value={values.weaknesses} />
          <Area label="Competitor strengths" name="competitorStrengths" value={values.competitorStrengths} />
          <Area label="Competitor weaknesses" name="competitorWeaknesses" value={values.competitorWeaknesses} />
        </FormSection>

        <FormSection title="Win strategy">
          <Area label="Discriminators" name="discriminators" value={values.discriminators} />
          <Area label="Win themes" name="winThemes" value={values.winThemes} />
          <Area label="Ghost themes" name="ghostThemes" value={values.ghostThemes} />
          <Area label="Proof points" name="proofPoints" value={values.proofPoints} />
          <Area label="Past performance alignment" name="pastPerformanceAlignment" value={values.pastPerformanceAlignment} />
        </FormSection>

        <FormSection title="Gaps to close">
          <Area label="Teaming gaps" name="teamingGaps" value={values.teamingGaps} />
          <Area label="Staffing gaps" name="staffingGaps" value={values.staffingGaps} />
          <Area label="Technical gaps" name="technicalGaps" value={values.technicalGaps} />
          <Area label="Readiness gaps" name="readinessGaps" value={values.readinessGaps} />
        </FormSection>

        <FormSection title="Pricing & actions">
          <Area label="Pricing posture" name="pricingPosture" value={values.pricingPosture} />
          <Area label="Capture actions" name="captureActions" value={values.captureActions} />
          <FormField label="Capture owner (Hub user id)" name="ownerId">
            <TextInput name="ownerId" defaultValue={values.ownerId ?? ""} />
          </FormField>
        </FormSection>

        {canEdit ? (
          <div className="flex items-center justify-end gap-2 print:hidden">
            <SaveButton />
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}

function Area({ label, name, value }: { label: string; name: string; value?: string | null }) {
  return (
    <FormField label={label} name={name} className={WIDE}>
      <TextArea name={name} rows={3} defaultValue={value ?? ""} />
    </FormField>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save capture plan"}
    </Button>
  );
}
