import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listDirectoryOrganizations } from "@/lib/services/directory";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader } from "@/components/ui/misc";
import { DirectoryContactForm } from "@/components/directory/directory-contact-form";

export const metadata: Metadata = { title: "New directory contact" };
export const dynamic = "force-dynamic";

export default async function NewDirectoryContactPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE)) redirect("/directory");
  const organizations = await listDirectoryOrganizations(ctx);

  return (
    <>
      <div className="mb-4">
        <Link href="/directory" className="text-sm text-blue-600 hover:underline">← Directory</Link>
      </div>
      <PageHeader title="New contact" subtitle="Add a person to the company address book." />
      <DirectoryContactForm
        mode="create"
        organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
      />
    </>
  );
}
