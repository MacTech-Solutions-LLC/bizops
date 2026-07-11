"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import { ProgressBar } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status-pill";
import { SBIR_RECOMMENDATION_STYLES, styleFor } from "@/lib/ui/status";
import { SBIR_CRITERIA, SBIR_RECOMMENDATIONS } from "@/lib/ui/enums";
import { saveAssessmentAction, type FormState } from "@/app/(app)/sbir/actions";

export interface AssessmentValues {
  missionAlignment?: number | null;
  technicalNovelty?: number | null;
  feasibility?: number | null;
  existingIp?: number | null;
  piAvailability?: number | null;
  commercialization?: number | null;
  phaseIiiPathway?: number | null;
  transitionSponsor?: number | null;
  pastPerformance?: number | null;
  teamCompleteness?: number | null;
  timeRemaining?: number | null;
  proposalEffort?: number | null;
  competitiveIntensity?: number | null;
  expectedAwardValue?: number | null;
  recommendation?: string | null;
  weightedScore?: number | null;
  technicalConcept?: string | null;
  workPlan?: string | null;
  keyPersonnel?: string | null;
  commercializationPlan?: string | null;
  transitionPlan?: string | null;
  dataRights?: string | null;
  version?: number;
}

const SCORE_OPTIONS = [
  { value: "", label: "—" },
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

/**
 * The scorecard editor. The weighted score shown here is computed client-side
 * for live feedback (0..100), but the server recomputes it authoritatively via
 * `scoreSbirAssessment` on save — the number never makes the decision.
 */
export function AssessmentEditor({
  topicId,
  values = {},
  canEdit,
}: {
  topicId: string;
  values?: AssessmentValues;
  canEdit: boolean;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveAssessmentAction, { ok: false });
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of SBIR_CRITERIA) {
      const v = (values as Record<string, unknown>)[c.key];
      init[c.key] = v === null || v === undefined ? "" : String(v);
    }
    return init;
  });

  const live = useMemo(() => {
    let weighted = 0;
    let maxWeighted = 0;
    let filled = 0;
    for (const c of SBIR_CRITERIA) {
      const raw = scores[c.key];
      if (raw === "" || raw === undefined) continue;
      const n = Math.max(0, Math.min(5, Number(raw)));
      if (!Number.isFinite(n)) continue;
      filled += 1;
      weighted += c.weight * n;
      maxWeighted += c.weight * 5;
    }
    const percent = maxWeighted > 0 ? Math.round((weighted / maxWeighted) * 10000) / 100 : 0;
    return { percent, filled };
  }, [scores]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="topicId" value={topicId} />
      {values.version !== undefined ? (
        <input type="hidden" name="expectedVersion" value={values.version} />
      ) : null}

      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}

      <div className="gc-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Live weighted fit score</p>
            <p className="text-2xl font-semibold text-slate-900">
              {live.percent.toFixed(1)}
              <span className="text-base font-normal text-slate-400"> / 100</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{live.filled} of {SBIR_CRITERIA.length} criteria scored</p>
          </div>
          <div className="min-w-[160px] flex-1 sm:max-w-xs">
            <ProgressBar value={live.percent} label={`Weighted fit ${live.percent}`} />
          </div>
        </div>
      </div>

      <div className="gc-card overflow-hidden">
        <table className="gc-table">
          <thead>
            <tr>
              <th>Criterion</th>
              <th className="text-center">Weight</th>
              <th className="text-center">Score (0–5)</th>
            </tr>
          </thead>
          <tbody>
            {SBIR_CRITERIA.map((c) => (
              <tr key={c.key}>
                <td className="font-medium text-slate-700">{c.label}</td>
                <td className="text-center tabular-nums text-slate-500">×{c.weight}</td>
                <td className="text-center">
                  <select
                    name={c.key}
                    value={scores[c.key] ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => setScores((s) => ({ ...s, [c.key]: e.target.value }))}
                    aria-label={`${c.label} score`}
                    className="h-8 w-20 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                  >
                    {SCORE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Expected award value ($)" name="expectedAwardValue">
          <TextInput name="expectedAwardValue" type="number" step="1000" defaultValue={values.expectedAwardValue ?? ""} disabled={!canEdit} />
        </FormField>
        <FormField label="Recommendation" name="recommendation">
          <Select
            name="recommendation"
            options={SBIR_RECOMMENDATIONS}
            placeholder="— undecided —"
            defaultValue={values.recommendation ?? ""}
            disabled={!canEdit}
          />
        </FormField>
        <div className="flex items-end">
          {values.recommendation ? (
            <StatusPill style={styleFor(SBIR_RECOMMENDATION_STYLES, values.recommendation)} />
          ) : null}
        </div>
      </div>

      <div className="gc-card p-4">
        <p className="mb-3 text-sm font-semibold text-slate-800">Narrative</p>
        <div className="grid grid-cols-1 gap-4">
          <FormField label="Technical concept" name="technicalConcept">
            <TextArea name="technicalConcept" rows={3} defaultValue={values.technicalConcept ?? ""} disabled={!canEdit} />
          </FormField>
          <FormField label="Work plan" name="workPlan">
            <TextArea name="workPlan" rows={3} defaultValue={values.workPlan ?? ""} disabled={!canEdit} />
          </FormField>
          <FormField label="Key personnel" name="keyPersonnel">
            <TextArea name="keyPersonnel" rows={2} defaultValue={values.keyPersonnel ?? ""} disabled={!canEdit} />
          </FormField>
          <FormField label="Commercialization plan" name="commercializationPlan">
            <TextArea name="commercializationPlan" rows={3} defaultValue={values.commercializationPlan ?? ""} disabled={!canEdit} />
          </FormField>
          <FormField label="Transition plan" name="transitionPlan">
            <TextArea name="transitionPlan" rows={3} defaultValue={values.transitionPlan ?? ""} disabled={!canEdit} />
          </FormField>
          <FormField label="Data rights" name="dataRights">
            <TextArea name="dataRights" rows={2} defaultValue={values.dataRights ?? ""} disabled={!canEdit} />
          </FormField>
        </div>
      </div>

      {canEdit ? (
        <div className="flex items-center justify-end">
          <SubmitButton />
        </div>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save assessment"}
    </Button>
  );
}
