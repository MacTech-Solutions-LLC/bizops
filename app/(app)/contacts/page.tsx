import type { Metadata } from "next";
import Link from "next/link";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listContacts, listAgenciesSummary } from "@/lib/services/contacts";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { ContactTable, type ContactRow } from "@/components/contacts/contact-table";

export const metadata: Metadata = { title: "Agencies & Contacts" };
export const dynamic = "force-dynamic";

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  const filter = { q: str(searchParams.q), agencyId: str(searchParams.agencyId) };

  let body: React.ReactNode;
  try {
    const [contacts, agencies] = await Promise.all([
      listContacts(ctx, filter),
      listAgenciesSummary(ctx),
    ]);
    const rows: ContactRow[] = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      agencyName: c.agency?.name?.replace("[DEMO] ", "") ?? c.organizationName ?? null,
      officeName: c.office?.name ?? null,
      acquisitionRole: c.acquisitionRole,
      influence: c.influence,
      relationshipStrength: c.relationshipStrength,
      lastInteractionAt: c.lastInteractionAt ? c.lastInteractionAt.toISOString() : null,
    }));

    body = (
      <div className="space-y-4">
        <Card>
          <CardHeader title="Agencies" description="Customer organizations you are tracking." />
          {agencies.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No agencies yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {agencies.map((a) => (
                <Link
                  key={a.id}
                  href={`/contacts?agencyId=${a.id}`}
                  className="rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:bg-slate-50"
                >
                  <p className="truncate text-sm font-medium text-slate-800">{a.name.replace("[DEMO] ", "")}</p>
                  {a.abbreviation ? <p className="text-xs text-slate-400">{a.abbreviation}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {a._count.contacts} contacts · {a._count.offices} offices · {a._count.opportunities} pursuits
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <ContactTable
          rows={rows}
          agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
          filter={filter}
          canCreate={hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE)}
        />
      </div>
    );
  } catch {
    body = <ErrorState title="Contacts unavailable" />;
  }

  return (
    <>
      <PageHeader title="Agencies & Contacts" subtitle="Customer relationships, acquisition roles, and interaction history." />
      {body}
    </>
  );
}
