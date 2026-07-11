import { getGovConContext } from "@/lib/auth/govcon-context";
import { listOpportunities } from "@/lib/services/opportunities";
import { requireGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db/prisma";
import { toCsv } from "@/lib/export/csv";
import { toAppError } from "@/lib/errors";
import { toNumber, weightedValue } from "@/lib/domain/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Authorized CSV export of the (filtered) opportunity pipeline. Requires
 * GOVCON_EXPORT and records an audit event. */
export async function GET(request: Request) {
  const ctx = await getGovConContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  try {
    requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT);
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    // Export the full result set (cap at a safe page size).
    const result = await listOpportunities(ctx, { ...params, page: 1, pageSize: 200 });

    const headers = [
      "Internal Name",
      "Solicitation #",
      "Agency",
      "Type",
      "Stage",
      "Role",
      "PWin",
      "Estimated Value",
      "Weighted Value",
      "Proposal Deadline",
      "Health",
    ];
    const rows = result.items.map((o) => [
      o.internalName,
      o.solicitationNumber ?? "",
      // @ts-expect-error include agency relation
      o.agency?.name ?? "",
      o.type,
      o.stage,
      o.teamRole,
      o.pWin ?? "",
      toNumber(o.estimatedValue),
      weightedValue(o.estimatedValue, o.pWin),
      o.proposalDeadline ? o.proposalDeadline.toISOString().slice(0, 10) : "",
      o.health,
    ]);
    const csv = toCsv(headers, rows);

    await recordAudit(prisma, ctx, {
      action: "opportunities.exported",
      eventCategory: "security",
      entityType: "GovConOpportunity",
      entityId: "list",
      summary: `Exported ${rows.length} opportunities to CSV`,
      metadata: { count: rows.length, filters: params },
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="opportunities-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    return new Response(appErr.userMessage, { status: appErr.status });
  }
}
