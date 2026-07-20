import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listDirectoryContacts, listDirectoryOrganizations } from "@/lib/services/directory";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { humanizeEnum } from "@/lib/ui/format";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DirectoryTable, type DirectoryRow } from "@/components/directory/directory-table";

export const metadata: Metadata = { title: "Directory" };
export const dynamic = "force-dynamic";

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  const filter = {
    q: str(searchParams.q),
    kind: str(searchParams.kind),
    organizationId: str(searchParams.organizationId),
  };
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE);

  let body: React.ReactNode;
  try {
    const [contacts, organizations] = await Promise.all([
      listDirectoryContacts(ctx, filter),
      listDirectoryOrganizations(ctx),
    ]);
    const rows: DirectoryRow[] = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      title: c.title,
      organizationName: c.organization?.name ?? c.organizationName ?? null,
      email: c.email,
      phone: c.phone,
      tags: c.tags,
    }));

    body = (
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Organizations"
            description="Companies, agencies, and partners in the address book."
            action={canManage ? (
              <Button asChild size="sm" variant="secondary">
                <Link href="/directory/organizations/new"><Plus className="h-4 w-4" /> Organization</Link>
              </Button>
            ) : undefined}
          />
          {organizations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No organizations yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {organizations.map((o) => (
                <Link
                  key={o.id}
                  href={`/directory/organizations/${o.id}`}
                  className="rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:bg-slate-50"
                >
                  <p className="truncate text-sm font-medium text-slate-800">{o.name}</p>
                  <p className="text-xs text-slate-400">{humanizeEnum(o.orgType)}</p>
                  <p className="mt-1 text-xs text-slate-500">{o._count.contacts} contacts</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <DirectoryTable
          rows={rows}
          organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
          filter={filter}
          canManage={canManage}
        />
      </div>
    );
  } catch {
    body = <ErrorState title="Directory unavailable" />;
  }

  return (
    <>
      <PageHeader
        title="Directory"
        subtitle="The company address book — internal teammates and external contracting contacts, shared across MacTech apps."
      />
      {body}
    </>
  );
}
