import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { ReadinessForm } from "@/components/readiness/readiness-form";

export const metadata: Metadata = { title: "New Readiness Item" };
export const dynamic = "force-dynamic";

export default async function NewReadinessPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_READINESS_MANAGE)) {
    return (
      <>
        <PageHeader title="New Readiness Item" />
        <PermissionState description="You need readiness management permission to add items." />
      </>
    );
  }
  return (
    <>
      <PageHeader title="New Readiness Item" subtitle="Track a registration, certification, or clearance." />
      <ReadinessForm mode="create" />
    </>
  );
}
