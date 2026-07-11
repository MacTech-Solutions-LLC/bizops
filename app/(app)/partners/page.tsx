import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listPartners } from "@/lib/services/partners";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { PartnerTable, type PartnerRow } from "@/components/partners/partner-table";

export const metadata: Metadata = { title: "Teaming Partners" };
export const dynamic = "force-dynamic";

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  const filter = { q: str(searchParams.q), businessSize: str(searchParams.businessSize) };

  let body: React.ReactNode;
  try {
    const partners = await listPartners(ctx, filter);
    const rows: PartnerRow[] = partners.map((p) => ({
      id: p.id,
      legalName: p.legalName,
      uei: p.uei,
      cageCode: p.cageCode,
      businessSize: p.businessSize,
      socioeconomicStatus: p.socioeconomicStatus,
      ndaStatus: p.ndaStatus,
      teamingStatus: p.teamingStatus,
      relationshipOwner: p.relationshipOwner,
    }));
    body = (
      <PartnerTable
        rows={rows}
        filter={filter}
        canCreate={hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE)}
      />
    );
  } catch {
    body = <ErrorState title="Partners unavailable" />;
  }

  return (
    <>
      <PageHeader title="Teaming Partners" subtitle="Your teaming network — capabilities, agreements, and gap analysis." />
      {body}
    </>
  );
}
