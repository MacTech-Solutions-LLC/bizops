import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listOpportunities } from "@/lib/services/opportunities";
import { listAgencyOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { toNumber, weightedValue } from "@/lib/domain/metrics";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { OpportunityTable, type OppRow } from "@/components/opportunities/opportunity-table";

export const metadata: Metadata = { title: "Opportunities" };
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();

  const filter = {
    q: str(searchParams.q),
    stage: str(searchParams.stage),
    health: str(searchParams.health),
    agencyId: str(searchParams.agencyId),
    sortBy: str(searchParams.sortBy) ?? "proposalDeadline",
    sortDir: (str(searchParams.sortDir) as "asc" | "desc") ?? "asc",
    includeArchived: str(searchParams.includeArchived) === "true",
    page: Number(str(searchParams.page) ?? "1"),
  };

  let body: React.ReactNode;
  try {
    const [result, agencies] = await Promise.all([
      listOpportunities(ctx, { ...filter, pageSize: 25 }),
      listAgencyOptions(ctx),
    ]);

    const rows: OppRow[] = result.items.map((o) => ({
      id: o.id,
      internalName: o.internalName,
      solicitationNumber: o.solicitationNumber,
      // @ts-expect-error agency relation included by the service
      agencyName: o.agency?.name ?? null,
      // @ts-expect-error office relation included by the service
      officeName: o.office?.name ?? null,
      type: o.type,
      stage: o.stage,
      teamRole: o.teamRole,
      pWin: o.pWin,
      estimatedValue: toNumber(o.estimatedValue),
      weightedValue: weightedValue(o.estimatedValue, o.pWin),
      proposalDeadline: o.proposalDeadline ? o.proposalDeadline.toISOString() : null,
      captureOwnerId: o.captureOwnerId,
      proposalManagerId: o.proposalManagerId,
      health: o.health,
      nextAction: o.nextAction,
    }));

    body = (
      <OpportunityTable
        rows={rows}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        canExport={hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT)}
        canArchive={hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ARCHIVE)}
        filter={filter}
      />
    );
  } catch {
    body = <ErrorState title="Opportunities unavailable" />;
  }

  return (
    <>
      <PageHeader title="Opportunities" subtitle="Every pursuit across the capture and proposal pipeline." />
      {body}
    </>
  );
}

function str(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
