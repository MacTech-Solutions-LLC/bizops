import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listAgencyOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { SbirForm } from "@/components/sbir/sbir-form";

export const metadata: Metadata = { title: "New SBIR Topic" };
export const dynamic = "force-dynamic";

export default async function NewSbirTopicPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE)) {
    return (
      <>
        <PageHeader title="New SBIR Topic" />
        <PermissionState description="You need SBIR management permission to add topics." />
      </>
    );
  }
  const agencies = await listAgencyOptions(ctx);
  return (
    <>
      <PageHeader title="New SBIR Topic" subtitle="Track an SBIR/STTR topic for assessment and submission." />
      <SbirForm mode="create" agencies={agencies.map((a) => ({ id: a.id, name: a.name }))} />
    </>
  );
}
