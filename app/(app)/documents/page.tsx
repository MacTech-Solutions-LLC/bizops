import type { Metadata } from "next";
import Link from "next/link";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listDocuments } from "@/lib/services/documents";
import { listOpportunityOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { DocumentForm } from "@/components/documents/document-form";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const ctx = await requireGovConContext();
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DOCUMENTS_MANAGE);

  let body: React.ReactNode;
  try {
    const [docs, opps] = await Promise.all([listDocuments(ctx), listOpportunityOptions(ctx)]);
    body = (
      <div className="space-y-4">
        {canManage && (
          <Card>
            <CardHeader title="Register a document" description="Metadata only — binaries live in external storage." />
            <DocumentForm opportunities={opps.map((o) => ({ id: o.id, name: o.internalName }))} />
          </Card>
        )}
        <Card className="overflow-hidden">
          <CardHeader title={`Documents (${docs.length})`} />
          {docs.length === 0 ? (
            <EmptyState title="No documents yet" description="Register solicitation, proposal, and compliance artifacts here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="gc-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Pursuit</th>
                    <th>Provider</th>
                    <th>Sensitivity</th>
                    <th>Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td className="font-medium text-slate-800">{d.name}</td>
                      <td className="text-slate-500">{humanizeEnum(d.category)}</td>
                      <td className="text-slate-500">{humanizeEnum(d.status)}</td>
                      <td>
                        {d.opportunity ? (
                          <Link href={`/opportunities/${d.opportunity.id}`} className="text-blue-600 hover:underline">
                            {d.opportunity.internalName.replace("[DEMO] ", "")}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-slate-500">{d.storageProvider ?? "—"}</td>
                      <td className="text-slate-500">{d.sensitivityMarking ?? "—"}</td>
                      <td className="whitespace-nowrap text-slate-500">{formatDate(d.uploadedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  } catch {
    body = <ErrorState title="Documents unavailable" />;
  }

  return (
    <>
      <PageHeader title="Documents" subtitle="Solicitation, proposal, compliance, and teaming document index." />
      {body}
    </>
  );
}
