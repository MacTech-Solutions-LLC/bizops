import { getGovConContext } from "@/lib/auth/govcon-context";
import { getReportsData } from "@/lib/services/reports";
import { requireGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db/prisma";
import { toCsv } from "@/lib/export/csv";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Authorized CSV export of a named report. Requires GOVCON_EXPORT + audits. */
export async function GET(request: Request) {
  const ctx = await getGovConContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  try {
    requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT);
    const report = new URL(request.url).searchParams.get("report") ?? "byAgency";
    const data = await getReportsData(ctx);

    let headers: string[];
    let rows: Array<Array<unknown>>;
    switch (report) {
      case "byStage":
      case "byAgency":
      case "byNaics":
      case "byVehicle":
      case "byOwner": {
        headers = ["Group", "Count", "Total Value", "Weighted Value"];
        rows = data[report].map((r) => [r.label, r.count, r.totalValue, r.weightedValue]);
        break;
      }
      case "forecast":
        headers = ["Month", "Count", "Weighted Value"];
        rows = data.forecast.map((f) => [f.month, f.count, f.weightedValue]);
        break;
      default:
        headers = ["Group", "Count", "Total Value", "Weighted Value"];
        rows = data.byAgency.map((r) => [r.label, r.count, r.totalValue, r.weightedValue]);
    }

    await recordAudit(prisma, ctx, {
      action: "report.exported",
      eventCategory: "security",
      entityType: "Report",
      entityId: report,
      summary: `Exported report "${report}" (${rows.length} rows)`,
      metadata: { report, rows: rows.length },
    });

    return new Response(toCsv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${report}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    return new Response(appErr.userMessage, { status: appErr.status });
  }
}
