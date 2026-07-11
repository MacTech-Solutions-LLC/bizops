import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getContact } from "@/lib/services/contacts";
import { listAgencyOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { ContactForm } from "@/components/contacts/contact-form";

export const metadata: Metadata = { title: "Edit Contact" };
export const dynamic = "force-dynamic";

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE)) {
    return (
      <>
        <PageHeader title="Edit Contact" />
        <PermissionState description="You need contact management permission to edit contacts." />
      </>
    );
  }
  let contact;
  try {
    contact = await getContact(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const agencies = await listAgencyOptions(ctx);
  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <>
      <PageHeader title="Edit Contact" subtitle={contact.name} />
      <ContactForm
        mode="edit"
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        values={{
          id: contact.id,
          name: contact.name,
          title: contact.title,
          organizationName: contact.organizationName,
          agencyId: contact.agencyId,
          officeId: contact.officeId,
          email: contact.email,
          phone: contact.phone,
          contactType: contact.contactType,
          acquisitionRole: contact.acquisitionRole,
          decisionRole: contact.decisionRole,
          influence: contact.influence,
          relationshipStrength: contact.relationshipStrength,
          nextActionAt: iso(contact.nextActionAt),
          nextAction: contact.nextAction,
          meetingNotes: contact.meetingNotes,
          sensitivityNotes: contact.sensitivityNotes,
        }}
      />
    </>
  );
}
