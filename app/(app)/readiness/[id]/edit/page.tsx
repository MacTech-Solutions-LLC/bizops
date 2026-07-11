import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getReadinessItem } from "@/lib/services/readiness";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { ReadinessForm } from "@/components/readiness/readiness-form";

export const metadata: Metadata = { title: "Edit Readiness Item" };
export const dynamic = "force-dynamic";

export default async function EditReadinessPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_READINESS_MANAGE)) {
    return (
      <>
        <PageHeader title="Edit Readiness Item" />
        <PermissionState description="You need readiness management permission to edit items." />
      </>
    );
  }
  let item;
  try {
    item = await getReadinessItem(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <>
      <PageHeader title="Edit Readiness Item" subtitle={item.name} />
      <ReadinessForm
        mode="edit"
        values={{
          id: item.id,
          category: item.category,
          name: item.name,
          status: item.status,
          ownerId: item.ownerId,
          issuer: item.issuer,
          identifier: item.identifier,
          effectiveDate: iso(item.effectiveDate),
          expirationDate: iso(item.expirationDate),
          renewalDate: iso(item.renewalDate),
          evidenceLink: item.evidenceLink,
          reminderLeadDays: item.reminderLeadDays,
          notes: item.notes,
        }}
      />
    </>
  );
}
