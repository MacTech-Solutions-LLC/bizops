import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { VehicleForm } from "@/components/vehicles/vehicle-form";

export const metadata: Metadata = { title: "New Contract Vehicle" };
export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE)) {
    return (
      <>
        <PageHeader title="New Contract Vehicle" />
        <PermissionState description="You need partner management permission to add vehicles." />
      </>
    );
  }
  return (
    <>
      <PageHeader title="New Contract Vehicle" subtitle="Track a contract vehicle and its ordering access." />
      <VehicleForm mode="create" />
    </>
  );
}
