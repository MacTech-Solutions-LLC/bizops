import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CircleAlert } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getActiveBidDetail } from "@/lib/services/bid-decisions";
import { isNextControlFlowError } from "@/lib/auth/context";
import { NotFoundError } from "@/lib/errors";
import { toNumber } from "@/lib/domain/metrics";
import { formatCurrencyFull, formatDate, humanizeEnum } from "@/lib/ui/format";
import {
  BID_OUTCOME_STYLES,
  HEALTH_STYLES,
  MILESTONE_STATUS_STYLES,
  PRIORITY_STYLES,
  SEVERITY_STYLES,
  STAGE_STYLES,
  TEAM_ROLE_STYLES,
} from "@/lib/ui/status";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { ArtifactRegister } from "@/components/active-bids/artifact-register";
import { blockedOnFrom } from "@/components/active-bids/bid-card";
import { cn } from "@/lib/ui/cn";

export const metadata: Metadata = { title: "Bid Room" };
export const dynamic = "force-dynamic";

/** A labelled fact in the rail. Renders nothing when the value is absent. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium text-slate-800">{value}</dd>
    </div>
  );
}

/** A narrative block from the bid summary. Skipped entirely when unwritten. */
function Narrative({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{body}</p>
    </div>
  );
}

function relativeDays(days: number | null): string {
  if (days === null) return "no date";
  if (days === 0) return "today";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

export default async function BidRoomPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();

  let bid: Awaited<ReturnType<typeof getActiveBidDetail>>;
  try {
    bid = await getActiveBidDetail(ctx, params.id);
  } catch (err) {
    if (isNextControlFlowError(err)) throw err;
    if (err instanceof NotFoundError) notFound();
    return (
      <>
        <PageHeader title="Bid Room" subtitle="Active bid detail" />
        <ErrorState title="This bid could not be loaded" />
      </>
    );
  }

  const agency = bid.agency?.abbreviation ?? bid.agency?.name ?? null;
  const gateUrgent = bid.daysToGate !== null && bid.daysToGate <= 14;

  return (
    <>
      <div className="mb-3">
        <Link
          href="/active-bids"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Active Bids
        </Link>
      </div>

      <PageHeader
        title={bid.internalName}
        subtitle={[bid.solicitationTitle, bid.solicitationNumber, agency].filter(Boolean).join(" · ")}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill map={STAGE_STYLES} value={bid.stage} />
            <StatusPill map={HEALTH_STYLES} value={bid.health} />
            <StatusPill map={BID_OUTCOME_STYLES} value={bid.bidDecision?.outcome ?? "PENDING"} />
          </div>
        }
      />

      {/* Money strip — the three numbers that describe the bid's shape. */}
      <section aria-label="Bid value" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Basis of bid</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">
            {formatCurrencyFull(toNumber(bid.estimatedValue))}
          </p>
          <p className="mt-1 text-xs text-slate-500">{bid.contractType ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contingent</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-700">
            {bid.contingent > 0 ? `+${formatCurrencyFull(bid.contingent)}` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {bid.contingent > 0 ? "Adders and alternates, priced but unelected" : "No contingent adders"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border bg-white p-4 shadow-sm",
            gateUrgent ? "border-amber-300" : "border-slate-200",
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next gate</p>
          <p
            className={cn(
              "mt-1.5 text-2xl font-semibold tabular-nums",
              gateUrgent ? "text-amber-700" : "text-slate-900",
            )}
          >
            {relativeDays(bid.daysToGate)}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {bid.nextGate ? `${bid.nextGate.title} · ${formatDate(bid.nextGate.dueAt)}` : "Nothing on the calendar"}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          {/* Next action — the single most important thing. */}
          {bid.nextAction ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Next action</p>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">{bid.nextAction}</p>
              {bid.nextActionDueAt ? (
                <p className="mt-1 text-xs text-blue-700">by {formatDate(bid.nextActionDueAt)}</p>
              ) : null}
            </div>
          ) : null}

          <Card>
            <CardHeader title="Bid summary" description="Why we bid, and what we bid." />
            <div className="space-y-4 p-4">
              <Narrative title="Decision" body={bid.bidDecisionSummary} />
              <Narrative title="Win themes" body={bid.winThemes} />
              <Narrative title="Discriminators" body={bid.discriminators} />
              <Narrative title="Customer pain points" body={bid.customerPainPoints} />
              <Narrative title="Solution" body={bid.solutionHypothesis} />
              <Narrative title="Pricing approach" body={bid.pricingHypothesis} />
              <Narrative title="Key personnel" body={bid.keyPersonnelNeeds} />
              <Narrative title="Clearance" body={bid.clearanceNeeds} />
              <Narrative title="Compliance" body={bid.complianceRequirements} />
            </div>
          </Card>

          {bid.tasks.length > 0 ? (
            <Card>
              <CardHeader
                title="Open items"
                description={`${bid.tasks.length} unresolved — grouped by who owes the answer.`}
              />
              <ul className="divide-y divide-slate-100">
                {bid.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                    <CircleAlert
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        t.priority === "CRITICAL"
                          ? "text-red-500"
                          : t.priority === "HIGH"
                            ? "text-orange-400"
                            : "text-slate-300",
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{t.title}</span>
                        <StatusPill map={PRIORITY_STYLES} value={t.priority} />
                        {t.dueAt ? (
                          <span className="text-xs text-slate-400">by {formatDate(t.dueAt)}</span>
                        ) : null}
                      </div>
                      {t.description ? (
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-500">
                          {t.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{blockedOnFrom(t.tags) ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {bid.risks.length > 0 ? (
            <Card>
              <CardHeader title="Risk register" description={`${bid.risks.length} live risks.`} />
              <ul className="divide-y divide-slate-100">
                {bid.risks.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill map={SEVERITY_STYLES} value={r.severity} />
                      <span className="text-sm font-medium text-slate-800">{r.title}</span>
                      {r.category ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                          {r.category}
                        </span>
                      ) : null}
                      {r.likelihood ? (
                        <span className="text-xs text-slate-400">{r.likelihood} likelihood</span>
                      ) : null}
                    </div>
                    {r.description ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{r.description}</p>
                    ) : null}
                    {r.mitigation ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                        <span className="font-medium text-slate-600">Mitigation: </span>
                        {r.mitigation}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Artifacts"
              description={`${bid.documents.length} documents, registered by reference.`}
            />
            <ArtifactRegister artifacts={bid.documents} />
          </Card>
        </div>

        {/* Rail */}
        <aside className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Key facts" />
            <dl className="divide-y divide-slate-100 px-4 py-2">
              <Fact label="Solicitation" value={bid.solicitationNumber} />
              <Fact label="eProject / Notice" value={bid.noticeId} />
              <Fact label="Agency" value={bid.agency?.name} />
              <Fact label="Command" value={bid.command} />
              <Fact label="Contracting office" value={bid.contractingOffice} />
              <Fact label="Place of performance" value={bid.placeOfPerformance} />
              <Fact label="NAICS" value={bid.naics} />
              <Fact label="Set-aside" value={bid.setAside} />
              <Fact label="Competition" value={humanizeEnum(bid.competitionType)} />
              <Fact label="Our role" value={<StatusPill map={TEAM_ROLE_STYLES} value={bid.teamRole} />} />
              <Fact
                label="Period of performance"
                value={bid.periodOfPerformanceMonths ? `${bid.periodOfPerformanceMonths} months` : null}
              />
              <Fact label="Source" value={bid.sourceSystem} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Timeline" description="Every gate, past and ahead." />
            <ol className="divide-y divide-slate-100">
              {bid.milestones.map((m) => {
                const done = m.status === "COMPLETED";
                return (
                  <li key={m.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <CalendarClock
                      className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", done ? "text-slate-300" : "text-blue-400")}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-medium", done ? "text-slate-500" : "text-slate-800")}>
                        {m.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">
                          {m.dueAt ? formatDate(m.dueAt) : "date TBD"}
                        </span>
                        <StatusPill map={MILESTONE_STATUS_STYLES} value={m.status} />
                      </div>
                      {m.notes ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{m.notes}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
