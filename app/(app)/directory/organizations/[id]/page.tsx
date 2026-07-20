import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getDirectoryOrganization } from "@/lib/services/directory";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Directory organization" };
export const dynamic = "force-dynamic";

export default async function DirectoryOrganizationPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  let org;
  try {
    org = await getDirectoryOrganization(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE);
  const address = [org.addressLine1, org.addressLine2, org.city, org.state, org.postalCode, org.country]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="mb-4">
        <Link href="/directory" className="text-sm text-blue-600 hover:underline">← Directory</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{org.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {humanizeEnum(org.orgType)}
              {org.abbreviation ? ` · ${org.abbreviation}` : ""}
            </p>
          </div>
          {canManage && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/directory/organizations/${org.id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" />
            <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Field label="Website">
                {org.website ? (
                  <a href={org.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{org.website}</a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Email">
                {org.email ? <a href={`mailto:${org.email}`} className="text-blue-600 hover:underline">{org.email}</a> : "—"}
              </Field>
              <Field label="Phone">{org.phone ?? "—"}</Field>
              <Field label="UEI">{org.uei ?? "—"}</Field>
              <Field label="CAGE code">{org.cageCode ?? "—"}</Field>
              <Field label="Address">{address || "—"}</Field>
              <Field label="Status">{humanizeEnum(org.status)}</Field>
              <Field label="Tags">{org.tags.length ? org.tags.join(", ") : "—"}</Field>
              <Field label="Source app">{org.sourceApp ?? "—"}</Field>
            </dl>
            {org.notes ? (
              <div className="border-t border-slate-100 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{org.notes}</dd>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title={`People (${org.contacts.length})`}
              action={canManage ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href="/directory/new">Add contact</Link>
                </Button>
              ) : undefined}
            />
            {org.contacts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No contacts at this organization yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {org.contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <Link href={`/directory/${c.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600">
                        {c.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{c.title ?? "—"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{c.email ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Record" />
            <dl className="grid grid-cols-1 gap-4 p-4">
              <Field label="Created">{formatDate(org.createdAt)}</Field>
              <Field label="Updated">{formatDate(org.updatedAt)}</Field>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
