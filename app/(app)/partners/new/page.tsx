import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { PartnerForm } from "@/components/partners/partner-form";

export const metadata: Metadata = { title: "New Partner" };
export const dynamic = "force-dynamic";

export default async function NewPartnerPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE)) {
    return (
      <>
        <PageHeader title="New Partner" />
        <PermissionState description="You need partner management permission to add partners." />
      </>
    );
  }
  return (
    <>
      <PageHeader title="New Partner" subtitle="Add a teaming partner to your network." />
      <PartnerForm mode="create" />
    </>
  );
}
