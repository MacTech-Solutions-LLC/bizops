import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listTopics } from "@/lib/services/sbir";
import { listAgencyOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { toNumber } from "@/lib/domain/metrics";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { SbirTable, type SbirRow } from "@/components/sbir/sbir-table";

export const metadata: Metadata = { title: "SBIR / STTR" };
export const dynamic = "force-dynamic";

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SbirPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  const filter = {
    q: str(searchParams.q),
    program: str(searchParams.program),
    phase: str(searchParams.phase),
    agencyId: str(searchParams.agencyId),
  };

  let body: React.ReactNode;
  try {
    const [topics, agencies] = await Promise.all([listTopics(ctx, filter), listAgencyOptions(ctx)]);
    const rows: SbirRow[] = topics.map((t) => ({
      id: t.id,
      program: t.program,
      component: t.component,
      agencyName: t.agency?.name?.replace("[DEMO] ", "") ?? null,
      topicNumber: t.topicNumber,
      topicTitle: t.topicTitle,
      phase: t.phase,
      closeDate: t.closeDate ? t.closeDate.toISOString() : null,
      recommendation: t.assessment?.recommendation ?? null,
      weightedScore: t.assessment?.weightedScore ? toNumber(t.assessment.weightedScore) : null,
      awardRangeMax: t.awardRangeMax ? toNumber(t.awardRangeMax) : null,
    }));
    body = (
      <SbirTable
        rows={rows}
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        filter={filter}
        canCreate={hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE)}
      />
    );
  } catch {
    body = <ErrorState title="SBIR topics unavailable" />;
  }

  return (
    <>
      <PageHeader title="SBIR / STTR" subtitle="Innovation topics, fit assessments, and submission tracking." />
      {body}
    </>
  );
}
