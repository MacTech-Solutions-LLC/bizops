import type { Metadata } from "next";
import Link from "next/link";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getDashboardData, listOpportunities } from "@/lib/services/opportunities";
import { getUpcomingMilestones } from "@/lib/services/milestones";
import { listActivity } from "@/lib/services/activity";
import { STAGE_STYLES } from "@/lib/ui/status";
import { formatCurrency, formatDate, formatPercent } from "@/lib/ui/format";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MilestoneList } from "@/components/dashboard/milestone-list";
import { HEALTH_STYLES } from "@/lib/ui/status";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireGovConContext();

  let content: React.ReactNode;
  try {
    const [dashboard, recent, milestones, activity] = await Promise.all([
      getDashboardData(ctx),
      listOpportunities(ctx, { pageSize: 8, sortBy: "proposalDeadline", sortDir: "asc" }),
      getUpcomingMilestones(ctx, 45),
      listActivity(ctx, { limit: 12 }),
    ]);

    const k = dashboard.kpis;
    const pipelineData = dashboard.pipelineByStage.map((r) => ({
      stage: r.stage,
      label: STAGE_STYLES[r.stage]?.label ?? r.stage,
      count: r.count,
      totalValue: r.totalValue,
      weightedValue: r.weightedValue,
    }));

    content = (
      <>
        {/* KPI cards */}
        <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Active Pursuits" value={String(k.activePursuits)} href="/opportunities" tone="blue" emphasis />
          <KpiCard label="Active Bids" value={String(k.activeBids)} href="/active-bids" tone="teal" />
          <KpiCard label="Open SBIR/STTR" value={String(k.openSbirTopics)} href="/sbir" tone="violet" />
          <KpiCard
            label="Qualified Pipeline"
            value={formatCurrency(k.qualifiedPipeline)}
            hint="Total est. value, qualified+"
            href="/opportunities?stage=QUALIFIED"
            tone="blue"
          />
          <KpiCard
            label="Weighted Pipeline"
            value={formatCurrency(k.weightedPipeline)}
            hint="Est. value × PWin"
            href="/reports"
            tone="green"
            emphasis
          />
          <KpiCard
            label="Win Rate"
            value={k.winRate === null ? "—" : formatPercent(k.winRate * 100)}
            hint="Awarded ÷ decided"
            href="/reports"
            tone="green"
          />
          <KpiCard label="Upcoming Deadlines" value={String(k.upcomingDeadlines)} hint="Next 30 days" href="/calendar" tone="amber" />
          <KpiCard label="At-Risk Pursuits" value={String(k.atRiskPursuits)} href="/opportunities?health=AT_RISK" tone="red" />
          <KpiCard label="Awaiting Partners" value={String(k.awaitingPartnerActions)} href="/partners" tone="orange" />
          <KpiCard label="Proposals in Review" value={String(k.proposalsInReview)} href="/proposals" tone="violet" />
        </section>

        {/* Pipeline + agency */}
        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Weighted pipeline by stage" description="Estimated value × probability of win" />
            <PipelineChart data={pipelineData} />
          </Card>
          <Card>
            <CardHeader title="Pipeline by agency" />
            <div className="max-h-[280px] overflow-y-auto">
              {dashboard.pipelineByAgency.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">No pursuits yet.</p>
              ) : (
                <table className="gc-table">
                  <thead>
                    <tr>
                      <th>Agency</th>
                      <th className="text-right">#</th>
                      <th className="text-right">Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.pipelineByAgency.slice(0, 8).map((a) => (
                      <tr key={a.agencyId ?? "unassigned"}>
                        <td className="max-w-[160px] truncate">{a.agencyName}</td>
                        <td className="text-right tabular-nums">{a.count}</td>
                        <td className="text-right tabular-nums">{formatCurrency(a.weightedValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </section>

        {/* Opportunities + milestones + activity */}
        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Pursuits by deadline"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/opportunities">View all</Link>
                </Button>
              }
            />
            <div className="overflow-x-auto">
              <table className="gc-table">
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Stage</th>
                    <th>Health</th>
                    <th className="text-right">PWin</th>
                    <th className="text-right">Weighted</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.items.map((o) => (
                    <tr key={o.id}>
                      <td className="max-w-[220px]">
                        <Link href={`/opportunities/${o.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                          {o.internalName}
                        </Link>
                      </td>
                      <td><StatusPill map={STAGE_STYLES} value={o.stage} /></td>
                      <td><StatusPill map={HEALTH_STYLES} value={o.health} /></td>
                      <td className="text-right tabular-nums">{formatPercent(o.pWin)}</td>
                      <td className="text-right tabular-nums">
                        {formatCurrency(o.pWin ? Number(o.estimatedValue ?? 0) * (o.pWin / 100) : 0)}
                      </td>
                      <td className="whitespace-nowrap text-slate-500">{formatDate(o.proposalDeadline)}</td>
                    </tr>
                  ))}
                  {recent.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No opportunities yet.{" "}
                        <Link href="/opportunities/new" className="text-blue-600 hover:underline">
                          Create your first pursuit
                        </Link>
                        .
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Upcoming milestones" />
              <MilestoneList items={milestones} />
            </Card>
          </div>
        </section>

        <section className="mt-4">
          <Card>
            <CardHeader
              title="Recent activity"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/activity">View all</Link>
                </Button>
              }
            />
            <ActivityFeed items={activity} />
          </Card>
        </section>
      </>
    );
  } catch {
    content = <ErrorState title="Dashboard unavailable" description="We couldn't load your workspace metrics. Please retry shortly." />;
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your capture, bid, and proposal pipeline at a glance."
        actions={
          <Button asChild>
            <Link href="/opportunities/new">New opportunity</Link>
          </Button>
        }
      />
      {content}
    </>
  );
}
