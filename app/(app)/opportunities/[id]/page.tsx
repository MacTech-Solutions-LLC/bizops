import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getOpportunity } from "@/lib/services/opportunities";
import { listActivity } from "@/lib/services/activity";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { toNumber, weightedValue } from "@/lib/domain/metrics";
import {
  formatCurrencyFull,
  formatDate,
  formatPercent,
  humanizeEnum,
} from "@/lib/ui/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Field } from "@/components/ui/misc";
import { ProgressBar } from "@/components/ui/misc";
import {
  AGREEMENT_STYLES,
  HEALTH_STYLES,
  PRIORITY_STYLES,
  SEVERITY_STYLES,
  TEAM_ROLE_STYLES,
} from "@/lib/ui/status";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MilestoneList } from "@/components/dashboard/milestone-list";
import { AddMilestone } from "@/components/opportunities/add-milestone";
import {
  ArchiveButton,
  StageChanger,
} from "@/components/opportunities/opportunity-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: "Opportunity" };
}

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  let opp;
  try {
    opp = await getOpportunity(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const activity = await listActivity(ctx, { opportunityId: opp.id, limit: 12 });

  const canEdit = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EDIT);
  const canArchive = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ARCHIVE);
  const canViewFinancials = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_FINANCIAL_VIEW);
  const est = toNumber(opp.estimatedValue);
  const weighted = weightedValue(opp.estimatedValue, opp.pWin);

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <Link href="/opportunities" className="text-sm text-blue-600 hover:underline">
          ← Opportunities
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{opp.internalName}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {opp.solicitationTitle ?? "—"}
              {opp.solicitationNumber ? ` · ${opp.solicitationNumber}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StageChanger id={opp.id} stage={opp.stage} canEdit={canEdit} />
            <StatusPill map={HEALTH_STYLES} value={opp.health} />
            <StatusPill map={PRIORITY_STYLES} value={opp.priority} />
            {canEdit && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/opportunities/${opp.id}/edit`}>Edit</Link>
              </Button>
            )}
            <ArchiveButton id={opp.id} canArchive={canArchive} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Field label="Agency">{opp.agency?.name?.replace("[DEMO] ", "") ?? "—"}</Field>
              <Field label="Office">{opp.office?.name?.replace("[DEMO] ", "") ?? "—"}</Field>
              <Field label="Type">{humanizeEnum(opp.type)}</Field>
              <Field label="Role">
                <StatusPill map={TEAM_ROLE_STYLES} value={opp.teamRole} />
              </Field>
              <Field label="Competition">{humanizeEnum(opp.competitionType)}</Field>
              <Field label="Set-aside">{opp.setAside ?? "—"}</Field>
              <Field label="NAICS">{opp.naics ?? "—"}</Field>
              <Field label="PSC">{opp.psc ?? "—"}</Field>
              <Field label="Vehicle">{opp.vehicle?.name?.replace("[DEMO] ", "") ?? "—"}</Field>
              <Field label="Place of performance">{opp.placeOfPerformance ?? "—"}</Field>
              <Field label="Contract type">{opp.contractType ?? "—"}</Field>
              <Field label="Incumbent">{opp.incumbent ?? "—"}</Field>
            </dl>
          </Card>

          {canViewFinancials && (
            <Card>
              <CardHeader title="Commercial" />
              <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
                <Field label="Estimated value">{formatCurrencyFull(est || null)}</Field>
                <Field label="Weighted value">{formatCurrencyFull(weighted || null)}</Field>
                <Field label="Ceiling">{formatCurrencyFull(opp.ceiling ? toNumber(opp.ceiling) : null)}</Field>
                <Field label="Funded">{formatCurrencyFull(opp.fundedValue ? toNumber(opp.fundedValue) : null)}</Field>
              </dl>
            </Card>
          )}

          <Card>
            <CardHeader title="Pursuit intelligence" />
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-6">
                <ProbabilityGauge label="PWin" value={opp.pWin} />
                <ProbabilityGauge label="PGo" value={opp.pGo} />
                <ProbabilityGauge label="Strategic fit" value={opp.strategicFit} />
              </div>
              <IntelBlock label="Win themes" value={opp.winThemes} />
              <IntelBlock label="Discriminators" value={opp.discriminators} />
              <IntelBlock label="Customer hot buttons" value={opp.customerHotButtons} />
              <IntelBlock label="Ghost themes" value={opp.ghostThemes} />
              {opp.competitors.length > 0 && (
                <Field label="Competitors">{opp.competitors.join(", ")}</Field>
              )}
            </div>
          </Card>

          {opp.risks.length > 0 && (
            <Card>
              <CardHeader title={`Risks (${opp.risks.length})`} />
              <ul className="divide-y divide-slate-100">
                {opp.risks.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{r.title}</p>
                      {r.mitigation && <p className="text-xs text-slate-500">{r.mitigation}</p>}
                    </div>
                    <StatusPill map={SEVERITY_STYLES} value={r.severity} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Activity"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/activity">All</Link>
                </Button>
              }
            />
            <ActivityFeed items={activity} />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Ownership" />
            <div className="space-y-3 p-4">
              <OwnerRow label="Capture owner" id={opp.captureOwnerId} />
              <OwnerRow label="Proposal manager" id={opp.proposalManagerId} />
              <OwnerRow label="Executive sponsor" id={opp.executiveSponsorId} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Key dates" />
            <dl className="grid grid-cols-2 gap-3 p-4">
              <Field label="Posted">{formatDate(opp.postedDate)}</Field>
              <Field label="Questions due">{formatDate(opp.questionsDeadline)}</Field>
              <Field label="Proposal due">{formatDate(opp.proposalDeadline)}</Field>
              <Field label="Expected award">{formatDate(opp.expectedAwardDate)}</Field>
            </dl>
          </Card>

          <Card>
            <CardHeader title={`Milestones (${opp.milestones.length})`} />
            <AddMilestone opportunityId={opp.id} canEdit={canEdit} />
            <MilestoneList
              items={opp.milestones.map((m) => ({
                id: m.id,
                title: m.title,
                type: m.type,
                dueAt: m.dueAt,
                opportunity: null,
              }))}
            />
          </Card>

          <Card>
            <CardHeader title={`Teaming partners (${opp.partners.length})`} />
            {opp.partners.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No partners yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {opp.partners.map((p) => (
                  <li key={p.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-700">
                        {p.partner.legalName.replace("[DEMO] ", "")}
                      </span>
                      <StatusPill map={TEAM_ROLE_STYLES} value={p.role} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>NDA</span>
                      <StatusPill map={AGREEMENT_STYLES} value={p.ndaStatus} />
                      <span>Teaming</span>
                      <StatusPill map={AGREEMENT_STYLES} value={p.teamingStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function ProbabilityGauge({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-[100px]">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className="text-lg font-semibold text-slate-800">{formatPercent(value)}</span>
      </div>
      <ProgressBar value={value ?? 0} className="mt-1" label={`${label} ${formatPercent(value)}`} />
    </div>
  );
}

function IntelBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{value}</dd>
    </div>
  );
}

function OwnerRow({ label, id }: { label: string; id: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {id ? (
        <span className="flex items-center gap-2">
          <Avatar name={id} id={id} size="sm" />
          <span className="text-sm text-slate-600">{id}</span>
        </span>
      ) : (
        <span className="text-sm text-slate-400">Unassigned</span>
      )}
    </div>
  );
}
