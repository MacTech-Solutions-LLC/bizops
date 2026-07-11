import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listAgencyOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { ContactForm } from "@/components/contacts/contact-form";

export const metadata: Metadata = { title: "New Contact" };
export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE)) {
    return (
      <>
        <PageHeader title="New Contact" />
        <PermissionState description="You need contact management permission to add contacts." />
      </>
    );
  }
  const agencies = await listAgencyOptions(ctx);
  return (
    <>
      <PageHeader title="New Contact" subtitle="Add a government, teaming, or industry contact." />
      <ContactForm mode="create" agencies={agencies.map((a) => ({ id: a.id, name: a.name }))} />
    </>
  );
}
