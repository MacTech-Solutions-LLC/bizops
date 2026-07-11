import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getTopic } from "@/lib/services/sbir";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { toNumber } from "@/lib/domain/metrics";
import { formatCurrencyFull, formatDate, humanizeEnum } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status-pill";
import { SBIR_RECOMMENDATION_STYLES, STAGE_STYLES, styleFor } from "@/lib/ui/status";
import { AssessmentEditor, type AssessmentValues } from "@/components/sbir/assessment-editor";

export const metadata: Metadata = { title: "SBIR Topic" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "summary", label: "Topic Summary" },
  { key: "assessment", label: "Fit Assessment" },
  { key: "concept", label: "Technical Concept" },
  { key: "commercialization", label: "Commercialization" },
  { key: "transition", label: "Transition" },
  { key: "submission", label: "Submission" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SbirTopicPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  let topic;
  try {
    topic = await getTopic(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const canEdit = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE);
  const rawTab = str(searchParams.tab);
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "summary";
  const a = topic.assessment;
  const assessmentValues: AssessmentValues = {
    missionAlignment: a?.missionAlignment,
    technicalNovelty: a?.technicalNovelty,
    feasibility: a?.feasibility,
    existingIp: a?.existingIp,
    piAvailability: a?.piAvailability,
    commercialization: a?.commercialization,
    phaseIiiPathway: a?.phaseIiiPathway,
    transitionSponsor: a?.transitionSponsor,
    pastPerformance: a?.pastPerformance,
    teamCompleteness: a?.teamCompleteness,
    timeRemaining: a?.timeRemaining,
    proposalEffort: a?.proposalEffort,
    competitiveIntensity: a?.competitiveIntensity,
    expectedAwardValue: a?.expectedAwardValue ? toNumber(a.expectedAwardValue) : null,
    recommendation: a?.recommendation ?? null,
    weightedScore: a?.weightedScore ? toNumber(a.weightedScore) : null,
    technicalConcept: a?.technicalConcept ?? null,
    workPlan: a?.workPlan ?? null,
    keyPersonnel: a?.keyPersonnel ?? null,
    commercializationPlan: a?.commercializationPlan ?? null,
    transitionPlan: a?.transitionPlan ?? null,
    dataRights: a?.dataRights ?? null,
    version: a?.version,
  };

  return (
    <>
      <div className="mb-4">
        <Link href="/sbir" className="text-sm text-blue-600 hover:underline">← SBIR / STTR</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{topic.topicNumber}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{topic.topicTitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">{topic.program}</span>
            <StatusPill map={STAGE_STYLES} value={topic.stage} />
            {a?.recommendation ? <StatusPill style={styleFor(SBIR_RECOMMENDATION_STYLES, a.recommendation)} /> : null}
            {canEdit && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/sbir/${topic.id}/edit`}>Edit</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/sbir/${topic.id}?tab=${t.key}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              t.key === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "summary" && (
        <Card>
          <CardHeader title="Topic summary" />
          <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
            <Field label="Program">{topic.program}</Field>
            <Field label="Phase">{humanizeEnum(topic.phase)}</Field>
            <Field label="Agency">{topic.agency?.name?.replace("[DEMO] ", "") ?? "—"}</Field>
            <Field label="Component">{topic.component ?? "—"}</Field>
            <Field label="TRL">{topic.trl ?? "—"}</Field>
            <Field label="Period of performance">{topic.periodOfPerformanceMonths ? `${topic.periodOfPerformanceMonths} mo` : "—"}</Field>
            <Field label="Award range">
              {topic.awardRangeMin || topic.awardRangeMax
                ? `${formatCurrencyFull(topic.awardRangeMin ? toNumber(topic.awardRangeMin) : null)} – ${formatCurrencyFull(topic.awardRangeMax ? toNumber(topic.awardRangeMax) : null)}`
                : "—"}
            </Field>
            <Field label="Technical POC">{topic.technicalPoc ?? "—"}</Field>
            <Field label="Contracting POC">{topic.contractingPoc ?? "—"}</Field>
          </dl>
          <div className="space-y-4 border-t border-slate-100 p-4">
            <Prose label="Objective" value={topic.objective} />
            <Prose label="Description" value={topic.description} />
            <Prose label="Phase I expectations" value={topic.phaseIExpectations} />
            <Prose label="Phase II expectations" value={topic.phaseIIExpectations} />
            <Prose label="Deliverables" value={topic.deliverables} />
            <Prose label="Eligibility notes" value={topic.eligibilityNotes} />
          </div>
        </Card>
      )}

      {tab === "assessment" && (
        <AssessmentEditor topicId={topic.id} values={assessmentValues} canEdit={canEdit} />
      )}

      {tab === "concept" && (
        <Card>
          <CardHeader title="Technical concept" description="Captured in the fit assessment." />
          <div className="space-y-4 p-4">
            <Prose label="Technical concept" value={a?.technicalConcept ?? null} />
            <Prose label="Work plan" value={a?.workPlan ?? null} />
            <Prose label="Key personnel" value={a?.keyPersonnel ?? null} />
          </div>
        </Card>
      )}

      {tab === "commercialization" && (
        <Card>
          <CardHeader title="Commercialization" />
          <div className="space-y-4 p-4">
            <Prose label="Commercialization plan" value={a?.commercializationPlan ?? null} />
          </div>
        </Card>
      )}

      {tab === "transition" && (
        <Card>
          <CardHeader title="Transition" />
          <div className="space-y-4 p-4">
            <Prose label="Phase III transition" value={topic.phaseIIITransition} />
            <Prose label="Transition plan" value={a?.transitionPlan ?? null} />
            <Prose label="Data rights" value={a?.dataRights ?? topic.dataRightsNotes} />
          </div>
        </Card>
      )}

      {tab === "submission" && (
        <Card>
          <CardHeader title="Submission" />
          <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
            <Field label="Submission portal">{topic.submissionPortal ?? "—"}</Field>
            <Field label="Pre-release">{formatDate(topic.preReleaseDate)}</Field>
            <Field label="Open">{formatDate(topic.openDate)}</Field>
            <Field label="Questions due">{formatDate(topic.questionsDeadline)}</Field>
            <Field label="Close">{formatDate(topic.closeDate)}</Field>
            <Field label="Source">
              {topic.sourceUrl ? (
                <a href={topic.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a>
              ) : "—"}
            </Field>
            <Field label="Required registrations">
              {topic.requiredRegistrations.length ? topic.requiredRegistrations.join(", ") : "—"}
            </Field>
          </dl>
        </Card>
      )}
    </>
  );
}

function Prose({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{value}</dd>
    </div>
  );
}
