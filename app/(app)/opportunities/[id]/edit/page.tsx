import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getOpportunity } from "@/lib/services/opportunities";
import { listAgencyOptions, listVehicleOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { toNumber } from "@/lib/domain/metrics";

export const metadata: Metadata = { title: "Edit Opportunity" };
export const dynamic = "force-dynamic";

export default async function EditOpportunityPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EDIT)) {
    return (
      <>
        <PageHeader title="Edit Opportunity" />
        <PermissionState description="You need edit permission to modify this pursuit." />
      </>
    );
  }

  let opp;
  try {
    opp = await getOpportunity(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const [agencies, vehicles] = await Promise.all([listAgencyOptions(ctx), listVehicleOptions(ctx)]);

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <>
      <PageHeader title="Edit Opportunity" subtitle={opp.internalName} />
      <OpportunityForm
        mode="edit"
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        vehicles={vehicles.map((v) => ({ id: v.id, name: v.name }))}
        values={{
          id: opp.id,
          version: opp.version,
          internalName: opp.internalName,
          solicitationTitle: opp.solicitationTitle,
          solicitationNumber: opp.solicitationNumber,
          noticeId: opp.noticeId,
          type: opp.type,
          sourceSystem: opp.sourceSystem,
          sourceUrl: opp.sourceUrl,
          agencyId: opp.agencyId,
          subAgency: opp.subAgency,
          contractingOffice: opp.contractingOffice,
          placeOfPerformance: opp.placeOfPerformance,
          setAside: opp.setAside,
          naics: opp.naics,
          psc: opp.psc,
          vehicleId: opp.vehicleId,
          contractType: opp.contractType,
          competitionType: opp.competitionType,
          estimatedValue: opp.estimatedValue ? toNumber(opp.estimatedValue) : null,
          ceiling: opp.ceiling ? toNumber(opp.ceiling) : null,
          fundedValue: opp.fundedValue ? toNumber(opp.fundedValue) : null,
          periodOfPerformanceMonths: opp.periodOfPerformanceMonths,
          postedDate: iso(opp.postedDate),
          responseDeadline: iso(opp.responseDeadline),
          questionsDeadline: iso(opp.questionsDeadline),
          proposalDeadline: iso(opp.proposalDeadline),
          expectedAwardDate: iso(opp.expectedAwardDate),
          stage: opp.stage,
          health: opp.health,
          priority: opp.priority,
          strategicFit: opp.strategicFit,
          pWin: opp.pWin,
          pGo: opp.pGo,
          teamRole: opp.teamRole,
          incumbent: opp.incumbent,
          captureOwnerId: opp.captureOwnerId,
          proposalManagerId: opp.proposalManagerId,
          executiveSponsorId: opp.executiveSponsorId,
          nextAction: opp.nextAction,
          winThemes: opp.winThemes,
          discriminators: opp.discriminators,
          customerHotButtons: opp.customerHotButtons,
        }}
      />
    </>
  );
}
