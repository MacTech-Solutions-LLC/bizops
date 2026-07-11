import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listAgencyOptions, listVehicleOptions } from "@/lib/services/reference";
import { requireGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { hasGovConPermission } from "@/lib/authz";

export const metadata: Metadata = { title: "New Opportunity" };
export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CREATE)) {
    return (
      <>
        <PageHeader title="New Opportunity" />
        <PermissionState description="You need create permission to add pursuits." />
      </>
    );
  }
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const [agencies, vehicles] = await Promise.all([listAgencyOptions(ctx), listVehicleOptions(ctx)]);

  return (
    <>
      <PageHeader title="New Opportunity" subtitle="Capture a new pursuit into the pipeline." />
      <OpportunityForm
        mode="create"
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        vehicles={vehicles.map((v) => ({ id: v.id, name: v.name }))}
      />
    </>
  );
}
