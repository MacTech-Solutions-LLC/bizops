import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listVehicles } from "@/lib/services/vehicles";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { toNumber } from "@/lib/domain/metrics";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { VehicleTable, type VehicleRow } from "@/components/vehicles/vehicle-table";

export const metadata: Metadata = { title: "Contract Vehicles" };
export const dynamic = "force-dynamic";

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  const filter = { q: str(searchParams.q), status: str(searchParams.status) };

  let body: React.ReactNode;
  try {
    const vehicles = await listVehicles(ctx, filter);
    const rows: VehicleRow[] = vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      vehicleType: v.vehicleType,
      agency: v.agency,
      primeHolder: v.primeHolder,
      ceiling: v.ceiling ? toNumber(v.ceiling) : null,
      orderingStatus: v.orderingStatus,
      startDate: v.startDate ? v.startDate.toISOString() : null,
      endDate: v.endDate ? v.endDate.toISOString() : null,
      status: v.status,
      taskOrderCount: v._count.opportunities,
    }));
    body = (
      <VehicleTable
        rows={rows}
        filter={filter}
        canCreate={hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE)}
      />
    );
  } catch {
    body = <ErrorState title="Contract vehicles unavailable" />;
  }

  return (
    <>
      <PageHeader title="Contract Vehicles" subtitle="IDIQ, GWAC, BPA, and GSA vehicles and their task-order pipelines." />
      {body}
    </>
  );
}
