import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listReadiness, type ReadinessItemWithExpiry } from "@/lib/services/readiness";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { READINESS_STYLES, styleFor } from "@/lib/ui/status";
import { cn } from "@/lib/ui/cn";

export const metadata: Metadata = { title: "Readiness" };
export const dynamic = "force-dynamic";

const EXPIRY_BADGE: Record<string, { label: string; cls: string }> = {
  expired: { label: "Expired", cls: "bg-red-50 text-red-700 ring-red-200" },
  expiring_soon: { label: "Expiring soon", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
};

export default async function ReadinessPage() {
  const ctx = await requireGovConContext();
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_READINESS_MANAGE);

  let body: React.ReactNode;
  try {
    const items = await listReadiness(ctx);
    const groups = new Map<string, ReadinessItemWithExpiry[]>();
    for (const entry of items) {
      const key = entry.item.category || "other";
      const arr = groups.get(key) ?? [];
      arr.push(entry);
      groups.set(key, arr);
    }
    const categories = [...groups.keys()].sort((a, b) => a.localeCompare(b));

    body =
      items.length === 0 ? (
        <Card>
          <p className="px-4 py-12 text-center text-sm text-slate-400">
            No readiness items tracked yet.
            {canManage ? (
              <>
                {" "}
                <Link href="/readiness/new" className="text-blue-600 hover:underline">Add one</Link>.
              </>
            ) : null}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <Card key={cat} className="overflow-hidden">
              <CardHeader title={humanizeEnum(cat)} description={`${groups.get(cat)!.length} item(s)`} />
              <div className="overflow-x-auto">
                <table className="gc-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Status</th>
                      <th>Issuer</th>
                      <th>Identifier</th>
                      <th>Effective</th>
                      <th>Expiration</th>
                      <th>Renewal</th>
                      <th>Evidence</th>
                      {canManage ? <th></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.get(cat)!.map(({ item, expiry }) => {
                      const badge = EXPIRY_BADGE[expiry];
                      return (
                        <tr key={item.id}>
                          <td className="max-w-[220px]">
                            <span className="font-medium text-slate-800">{item.name}</span>
                            {badge ? (
                              <span className={cn("ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", badge.cls)}>
                                <AlertTriangle className="h-3 w-3" /> {badge.label}
                              </span>
                            ) : null}
                          </td>
                          <td><StatusPill style={styleFor(READINESS_STYLES, item.status)} /></td>
                          <td className="text-slate-500">{item.issuer ?? "—"}</td>
                          <td className="text-slate-500">{item.identifier ?? "—"}</td>
                          <td className="whitespace-nowrap text-slate-500">{formatDate(item.effectiveDate)}</td>
                          <td className="whitespace-nowrap text-slate-500">{formatDate(item.expirationDate)}</td>
                          <td className="whitespace-nowrap text-slate-500">{formatDate(item.renewalDate)}</td>
                          <td>
                            {item.evidenceLink ? (
                              <a href={item.evidenceLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a>
                            ) : "—"}
                          </td>
                          {canManage ? (
                            <td>
                              <Link href={`/readiness/${item.id}/edit`} className="text-sm text-blue-600 hover:underline">Edit</Link>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      );
  } catch {
    body = <ErrorState title="Readiness unavailable" />;
  }

  return (
    <>
      <PageHeader
        title="Readiness"
        subtitle="Registrations, certifications, cyber, clearances, and insurance."
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link href="/readiness/new">New item</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="note">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="text-sm text-amber-800">
          Readiness tracking does not independently establish legal, regulatory, or certification
          compliance. It is an internal management aid only; verify status with the issuing authority.
        </p>
      </div>

      {body}
    </>
  );
}
