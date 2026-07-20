import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getDirectoryContact, listDirectoryOrganizations } from "@/lib/services/directory";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { PageHeader } from "@/components/ui/misc";
import { DirectoryContactForm } from "@/components/directory/directory-contact-form";

export const metadata: Metadata = { title: "Edit directory contact" };
export const dynamic = "force-dynamic";

export default async function EditDirectoryContactPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE)) {
    redirect(`/directory/${params.id}`);
  }
  let contact;
  try {
    contact = await getDirectoryContact(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const organizations = await listDirectoryOrganizations(ctx);

  return (
    <>
      <div className="mb-4">
        <Link href={`/directory/${contact.id}`} className="text-sm text-blue-600 hover:underline">← {contact.name}</Link>
      </div>
      <PageHeader title="Edit contact" />
      <DirectoryContactForm
        mode="edit"
        values={{ ...contact }}
        organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
      />
    </>
  );
}
