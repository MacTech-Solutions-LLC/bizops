import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getPartner } from "@/lib/services/partners";
import { listActivity } from "@/lib/services/activity";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Field } from "@/components/ui/misc";
import { AGREEMENT_STYLES, BUSINESS_SIZE_STYLES, STAGE_STYLES, TEAM_ROLE_STYLES, styleFor } from "@/lib/ui/status";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PartnerContacts } from "@/components/partners/partner-contacts";
import { ArchivePartnerButton } from "@/components/partners/partner-actions";

export const metadata: Metadata = { title: "Partner" };
export const dynamic = "force-dynamic";

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  let partner;
  try {
    partner = await getPartner(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const activity = await listActivity(ctx, { limit: 10 }).catch(() => []);
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);

  return (
    <>
      <div className="mb-4">
        <Link href="/partners" className="text-sm text-blue-600 hover:underline">← Teaming Partners</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{partner.legalName.replace("[DEMO] ", "")}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{partner.dba ? `DBA ${partner.dba}` : "—"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill style={styleFor(BUSINESS_SIZE_STYLES, partner.businessSize)} />
            {canManage && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/partners/${partner.id}/edit`}>Edit</Link>
              </Button>
            )}
            <ArchivePartnerButton id={partner.id} canArchive={canManage} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Identity" />
            <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Field label="UEI">{partner.uei ?? "—"}</Field>
              <Field label="CAGE code">{partner.cageCode ?? "—"}</Field>
              <Field label="Business size">{humanizeEnum(partner.businessSize)}</Field>
              <Field label="Facility clearance">{partner.facilityClearance ?? "—"}</Field>
              <Field label="Proposed role">{partner.proposedRole ?? "—"}</Field>
              <Field label="Risk">{partner.risk ?? "—"}</Field>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Capabilities" />
            <div className="space-y-3 p-4">
              <Field label="Socioeconomic status">
                <div className="mt-1 flex flex-wrap gap-1">
                  {partner.socioeconomicStatus.length ? partner.socioeconomicStatus.map((s) => (
                    <span key={s} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700 ring-1 ring-inset ring-teal-200">{s}</span>
                  )) : "—"}
                </div>
              </Field>
              <Field label="NAICS capabilities">
                {partner.naicsCapabilities.length ? partner.naicsCapabilities.join(", ") : "—"}
              </Field>
              <Field label="Contract vehicles">
                {partner.contractVehicles.length ? partner.contractVehicles.join(", ") : "—"}
              </Field>
              {partner.keyCapabilities ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Key capabilities</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{partner.keyCapabilities}</dd>
                </div>
              ) : null}
              {partner.pastPerformance ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Past performance</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{partner.pastPerformance}</dd>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title={`Active pursuits (${partner.opportunityPartners.length})`} />
            {partner.opportunityPartners.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Not teamed on any pursuits yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {partner.opportunityPartners.map((op) => (
                  <li key={op.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/opportunities/${op.opportunityId}`} className="min-w-0 truncate text-sm font-medium text-slate-700 hover:text-blue-600">
                      {op.opportunity.internalName}
                    </Link>
                    <div className="flex items-center gap-2">
                      <StatusPill map={STAGE_STYLES} value={op.opportunity.stage} />
                      <StatusPill map={TEAM_ROLE_STYLES} value={op.role} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <ActivityFeed items={activity} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Agreements" />
            <div className="space-y-3 p-4">
              <AgreementRow label="NDA" value={partner.ndaStatus} />
              <AgreementRow label="Teaming" value={partner.teamingStatus} />
              <AgreementRow label="Subcontract" value={partner.subcontractStatus} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Relationship owner" />
            <div className="p-4">
              {partner.relationshipOwner ? (
                <span className="flex items-center gap-2">
                  <Avatar name={partner.relationshipOwner} id={partner.relationshipOwner} size="sm" />
                  <span className="text-sm text-slate-600">{partner.relationshipOwner}</span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">Unassigned</span>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={`Contacts (${partner.contacts.length})`} />
            <PartnerContacts
              partnerId={partner.id}
              canManage={canManage}
              contacts={partner.contacts.map((c) => ({
                id: c.id,
                name: c.name,
                title: c.title,
                email: c.email,
                phone: c.phone,
                isPrimary: c.isPrimary,
              }))}
            />
          </Card>

          <Card>
            <CardHeader title={`Documents (${partner.documents.length})`} />
            {partner.documents.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                No documents linked. Manage NDAs, teaming agreements, and capability statements in Documents.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {partner.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="truncate text-slate-700">{d.name}</span>
                    <span className="text-xs text-slate-400">{humanizeEnum(d.category)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {partner.notes ? (
            <Card>
              <CardHeader title="Notes" />
              <p className="whitespace-pre-wrap p-4 text-sm text-slate-700">{partner.notes}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function AgreementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <StatusPill map={AGREEMENT_STYLES} value={value} />
    </div>
  );
}
