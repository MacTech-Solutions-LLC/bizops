import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getPartner } from "@/lib/services/partners";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { PartnerForm } from "@/components/partners/partner-form";

export const metadata: Metadata = { title: "Edit Partner" };
export const dynamic = "force-dynamic";

export default async function EditPartnerPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE)) {
    return (
      <>
        <PageHeader title="Edit Partner" />
        <PermissionState description="You need partner management permission to edit partners." />
      </>
    );
  }
  let partner;
  try {
    partner = await getPartner(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  return (
    <>
      <PageHeader title="Edit Partner" subtitle={partner.legalName.replace("[DEMO] ", "")} />
      <PartnerForm
        mode="edit"
        values={{
          id: partner.id,
          legalName: partner.legalName,
          dba: partner.dba,
          uei: partner.uei,
          cageCode: partner.cageCode,
          businessSize: partner.businessSize,
          socioeconomicStatus: partner.socioeconomicStatus,
          naicsCapabilities: partner.naicsCapabilities,
          contractVehicles: partner.contractVehicles,
          facilityClearance: partner.facilityClearance,
          keyCapabilities: partner.keyCapabilities,
          pastPerformance: partner.pastPerformance,
          relationshipOwner: partner.relationshipOwner,
          proposedRole: partner.proposedRole,
          ndaStatus: partner.ndaStatus,
          teamingStatus: partner.teamingStatus,
          subcontractStatus: partner.subcontractStatus,
          risk: partner.risk,
          notes: partner.notes,
        }}
      />
    </>
  );
}
