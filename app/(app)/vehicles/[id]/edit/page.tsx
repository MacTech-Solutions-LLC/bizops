import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getVehicle } from "@/lib/services/vehicles";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { toNumber } from "@/lib/domain/metrics";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { VehicleForm } from "@/components/vehicles/vehicle-form";

export const metadata: Metadata = { title: "Edit Contract Vehicle" };
export const dynamic = "force-dynamic";

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE)) {
    return (
      <>
        <PageHeader title="Edit Contract Vehicle" />
        <PermissionState description="You need partner management permission to edit vehicles." />
      </>
    );
  }
  let vehicle;
  try {
    vehicle = await getVehicle(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <>
      <PageHeader title="Edit Contract Vehicle" subtitle={vehicle.name.replace("[DEMO] ", "")} />
      <VehicleForm
        mode="edit"
        values={{
          id: vehicle.id,
          name: vehicle.name,
          vehicleType: vehicle.vehicleType,
          agency: vehicle.agency,
          contractNumber: vehicle.contractNumber,
          primeHolder: vehicle.primeHolder,
          subcontractAccess: vehicle.subcontractAccess,
          pools: vehicle.pools,
          naicsCodes: vehicle.naicsCodes,
          startDate: iso(vehicle.startDate),
          endDate: iso(vehicle.endDate),
          optionPeriods: vehicle.optionPeriods,
          ceiling: vehicle.ceiling ? toNumber(vehicle.ceiling) : null,
          orderingStatus: vehicle.orderingStatus,
          status: vehicle.status,
          renewalActions: vehicle.renewalActions,
          notes: vehicle.notes,
        }}
      />
    </>
  );
}
