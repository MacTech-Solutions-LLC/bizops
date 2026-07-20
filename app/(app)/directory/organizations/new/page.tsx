import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader } from "@/components/ui/misc";
import { DirectoryOrganizationForm } from "@/components/directory/directory-organization-form";

export const metadata: Metadata = { title: "New directory organization" };
export const dynamic = "force-dynamic";

export default async function NewDirectoryOrganizationPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE)) redirect("/directory");

  return (
    <>
      <div className="mb-4">
        <Link href="/directory" className="text-sm text-blue-600 hover:underline">← Directory</Link>
      </div>
      <PageHeader title="New organization" subtitle="Add a company, agency, or partner to the address book." />
      <DirectoryOrganizationForm mode="create" />
    </>
  );
}
