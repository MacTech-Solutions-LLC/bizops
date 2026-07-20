import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getDirectoryOrganization } from "@/lib/services/directory";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { PageHeader } from "@/components/ui/misc";
import { DirectoryOrganizationForm } from "@/components/directory/directory-organization-form";

export const metadata: Metadata = { title: "Edit directory organization" };
export const dynamic = "force-dynamic";

export default async function EditDirectoryOrganizationPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE)) {
    redirect(`/directory/organizations/${params.id}`);
  }
  let org;
  try {
    org = await getDirectoryOrganization(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <>
      <div className="mb-4">
        <Link href={`/directory/organizations/${org.id}`} className="text-sm text-blue-600 hover:underline">← {org.name}</Link>
      </div>
      <PageHeader title="Edit organization" />
      <DirectoryOrganizationForm mode="edit" values={{ ...org }} />
    </>
  );
}
