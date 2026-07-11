import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getContact } from "@/lib/services/contacts";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/misc";
import { LogInteraction } from "@/components/contacts/log-interaction";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  let contact;
  try {
    contact = await getContact(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE);

  return (
    <>
      <div className="mb-4">
        <Link href="/contacts" className="text-sm text-blue-600 hover:underline">← Agencies & Contacts</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{contact.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {contact.title ?? "—"}
              {contact.agency?.name ? ` · ${contact.agency.name.replace("[DEMO] ", "")}` : ""}
            </p>
          </div>
          {canManage && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/contacts/${contact.id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" />
            <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Field label="Organization">{contact.organizationName ?? contact.agency?.name?.replace("[DEMO] ", "") ?? "—"}</Field>
              <Field label="Office">{contact.office?.name ?? "—"}</Field>
              <Field label="Email">{contact.email ?? "—"}</Field>
              <Field label="Phone">{contact.phone ?? "—"}</Field>
              <Field label="Contact type">{humanizeEnum(contact.contactType)}</Field>
              <Field label="Acquisition role">{contact.acquisitionRole ?? "—"}</Field>
              <Field label="Decision role">{contact.decisionRole ?? "—"}</Field>
              <Field label="Influence">{humanizeEnum(contact.influence)}</Field>
              <Field label="Relationship">{humanizeEnum(contact.relationshipStrength)}</Field>
              <Field label="Last interaction">{formatDate(contact.lastInteractionAt)}</Field>
              <Field label="Next action">{contact.nextAction ?? "—"}</Field>
              <Field label="Next action date">{formatDate(contact.nextActionAt)}</Field>
            </dl>
            {contact.meetingNotes ? (
              <div className="border-t border-slate-100 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Meeting notes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{contact.meetingNotes}</dd>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title={`Interaction timeline (${contact.interactions.length})`} />
            {contact.interactions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No interactions logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {contact.interactions.map((i) => (
                  <li key={i.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        {i.channel ? humanizeEnum(i.channel) : "Interaction"}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(i.occurredAt)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{i.summary}</p>
                    {i.followUp ? (
                      <p className="mt-1 text-xs text-amber-700">Follow-up: {i.followUp}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {canManage ? (
            <Card>
              <CardHeader title="Log interaction" />
              <LogInteraction contactId={contact.id} />
            </Card>
          ) : null}
          {contact.sensitivityNotes ? (
            <Card>
              <CardHeader title="Sensitivity notes" />
              <p className="whitespace-pre-wrap p-4 text-sm text-slate-700">{contact.sensitivityNotes}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
