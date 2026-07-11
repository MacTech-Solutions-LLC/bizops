import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getReportsData } from "@/lib/services/reports";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { formatCurrency, formatPercent } from "@/lib/ui/format";
import { STAGE_STYLES } from "@/lib/ui/status";
import { PageHeader, PermissionState, ErrorState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ForecastChart, WinLossChart } from "@/components/reports/report-charts";
import { PrintButton } from "@/components/reports/print-button";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_REPORTS_VIEW)) {
    return (
      <>
        <PageHeader title="Reports" />
        <PermissionState description="You need reports access to view analytics." />
      </>
    );
  }
  const canExport = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT);

  let body: React.ReactNode;
  try {
    const data = await getReportsData(ctx);
    const exportBtn = (report: string) =>
      canExport ? (
        <Button asChild variant="ghost" size="sm">
          <a href={`/api/reports/export?report=${report}`}>Export CSV</a>
        </Button>
      ) : null;

    body = (
      <div className="space-y-4">
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Weighted forecast" description="By expected-award month" action={exportBtn("forecast")} />
            <div className="p-2">
              <ForecastChart data={data.forecast} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Win / loss" />
            <div className="p-2">
              <WinLossChart won={data.winLoss.won} lost={data.winLoss.lost} noBid={data.winLoss.noBid} />
              <div className="grid grid-cols-2 gap-2 px-4 pb-3 text-sm text-slate-600">
                <span>Win rate: {data.winLoss.winRate === null ? "—" : formatPercent(data.winLoss.winRate * 100)}</span>
                <span>Awarded value: {formatCurrency(data.winLoss.awardedValue)}</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <GroupTable title="Pipeline by agency" rows={data.byAgency} action={exportBtn("byAgency")} />
          <GroupTable title="Pipeline by NAICS" rows={data.byNaics} action={exportBtn("byNaics")} />
          <GroupTable title="Pipeline by vehicle" rows={data.byVehicle} action={exportBtn("byVehicle")} />
          <GroupTable title="Pipeline by owner" rows={data.byOwner} action={exportBtn("byOwner")} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Pipeline by stage" action={exportBtn("byStage")} />
            <table className="gc-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th className="text-right">#</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Weighted</th>
                </tr>
              </thead>
              <tbody>
                {data.byStage.filter((r) => r.count > 0).map((r) => (
                  <tr key={r.key}>
                    <td>{STAGE_STYLES[r.key]?.label ?? r.label}</td>
                    <td className="text-right tabular-nums">{r.count}</td>
                    <td className="text-right tabular-nums">{formatCurrency(r.totalValue)}</td>
                    <td className="text-right tabular-nums">{formatCurrency(r.weightedValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <CardHeader title="Opportunity aging" description="Active pursuits by age" />
            <table className="gc-table">
              <thead>
                <tr>
                  <th>Age bucket</th>
                  <th className="text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.aging.map((a) => (
                  <tr key={a.bucket}>
                    <td>{a.bucket}</td>
                    <td className="text-right tabular-nums">{a.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {data.noBidReasons.length > 0 && (
          <Card>
            <CardHeader title="No-bid reasons" />
            <table className="gc-table">
              <thead>
                <tr>
                  <th>Reason</th>
                  <th className="text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.noBidReasons.map((r) => (
                  <tr key={r.reason}>
                    <td>{r.reason}</td>
                    <td className="text-right tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    );
  } catch {
    body = <ErrorState title="Reports unavailable" />;
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Pipeline, forecast, win/loss, and aging analytics."
        actions={<PrintButton />}
      />
      {body}
    </>
  );
}

function GroupTable({
  title,
  rows,
  action,
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number; totalValue: number; weightedValue: number }>;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} action={action} />
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">No data.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="gc-table">
            <thead>
              <tr>
                <th>{title.replace("Pipeline by ", "")}</th>
                <th className="text-right">#</th>
                <th className="text-right">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((r) => (
                <tr key={r.key}>
                  <td className="max-w-[200px] truncate">{r.label}</td>
                  <td className="text-right tabular-nums">{r.count}</td>
                  <td className="text-right tabular-nums">{formatCurrency(r.weightedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
