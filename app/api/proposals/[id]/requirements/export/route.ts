import { getGovConContext } from "@/lib/auth/govcon-context";
import { getProposal } from "@/lib/services/proposals";
import { requireGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db/prisma";
import { toCsv } from "@/lib/export/csv";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Authorized CSV export of a proposal's compliance matrix. Requires
 * GOVCON_EXPORT and records an audit event ("requirements.exported"). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getGovConContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  try {
    requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT);
    const proposal = await getProposal(ctx, params.id);
    const volumeName = new Map(proposal.volumes.map((v) => [v.id, v.name]));

    const headers = [
      "Requirement ID",
      "Source Section",
      "Requirement Text",
      "Type",
      "Mandatory",
      "Volume",
      "Response Section",
      "Owner",
      "Status",
      "Evidence",
    ];
    const rows = proposal.requirements.map((r) => [
      r.refId,
      r.sourceSection ?? "",
      r.text,
      r.requirementType,
      r.mandatory ? "Yes" : "No",
      r.volumeId ? volumeName.get(r.volumeId) ?? "" : "",
      r.responseSection ?? "",
      r.ownerId ?? "",
      r.status,
      r.evidence ?? "",
    ]);
    const csv = toCsv(headers, rows);

    await recordAudit(prisma, ctx, {
      action: "requirements.exported",
      eventCategory: "security",
      entityType: "GovConProposal",
      entityId: proposal.id,
      opportunityId: proposal.opportunityId,
      summary: `Exported ${rows.length} requirements to CSV`,
      metadata: { count: rows.length, proposalId: proposal.id },
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="compliance-matrix-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    return new Response(appErr.userMessage, { status: appErr.status });
  }
}
