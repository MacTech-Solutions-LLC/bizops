import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getDirectoryContact } from "@/lib/services/directory";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Directory contact" };
export const dynamic = "force-dynamic";

function joinAddress(parts: Array<string | null>): string | null {
  const filled = parts.filter(Boolean);
  return filled.length ? filled.join(", ") : null;
}

export default async function DirectoryContactPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  let contact;
  try {
    contact = await getDirectoryContact(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE);
  const address = joinAddress([
    contact.addressLine1,
    contact.addressLine2,
    contact.city,
    contact.state,
    contact.postalCode,
    contact.country,
  ]);

  return (
    <>
      <div className="mb-4">
        <Link href="/directory" className="text-sm text-blue-600 hover:underline">← Directory</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{contact.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {contact.title ?? "—"}
              {contact.organization?.name ? ` · ${contact.organization.name}` : contact.organizationName ? ` · ${contact.organizationName}` : ""}
            </p>
          </div>
          {canManage && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/directory/${contact.id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" />
            <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Field label="Kind">{humanizeEnum(contact.kind)}</Field>
              <Field label="Department">{contact.department ?? "—"}</Field>
              <Field label="Organization">
                {contact.organization ? (
                  <Link href={`/directory/organizations/${contact.organization.id}`} className="text-blue-600 hover:underline">
                    {contact.organization.name}
                  </Link>
                ) : (
                  contact.organizationName ?? "—"
                )}
              </Field>
              <Field label="Email">
                {contact.email ? <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a> : "—"}
              </Field>
              <Field label="Phone">{contact.phone ?? "—"}</Field>
              <Field label="Mobile">{contact.mobile ?? "—"}</Field>
              <Field label="LinkedIn">
                {contact.linkedinUrl ? (
                  <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Profile</a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Address">{address ?? "—"}</Field>
              <Field label="Status">{humanizeEnum(contact.status)}</Field>
            </dl>
            {contact.notes ? (
              <div className="border-t border-slate-100 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{contact.notes}</dd>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Record" />
            <dl className="grid grid-cols-1 gap-4 p-4">
              <Field label="Tags">
                {contact.tags.length ? contact.tags.join(", ") : "—"}
              </Field>
              <Field label="Source app">{contact.sourceApp ?? "—"}</Field>
              <Field label="Created">{formatDate(contact.createdAt)}</Field>
              <Field label="Updated">{formatDate(contact.updatedAt)}</Field>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
