import type { Metadata } from "next";
import Link from "next/link";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { comparePartners } from "@/lib/services/partners";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { AGREEMENT_STYLES, BUSINESS_SIZE_STYLES, styleFor } from "@/lib/ui/status";
import { Check, Minus } from "lucide-react";

export const metadata: Metadata = { title: "Compare Partners" };
export const dynamic = "force-dynamic";

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ComparePartnersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  const ids = (str(searchParams.ids) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (ids.length < 2) {
    return (
      <>
        <PageHeader title="Compare Partners" />
        <EmptyState
          title="Select partners to compare"
          description="Choose two or more partners from the list to see a side-by-side gap matrix."
          action={<Link href="/partners" className="text-sm text-blue-600 hover:underline">Back to partners</Link>}
        />
      </>
    );
  }

  const matrix = await comparePartners(ctx, ids);
  const cols = matrix.partners;

  return (
    <>
      <PageHeader title="Compare Partners" subtitle={`${cols.length} partners side by side`}>
        <Link href="/partners" className="mt-1 inline-block text-sm text-blue-600 hover:underline">← Back to partners</Link>
      </PageHeader>

      <Card className="overflow-hidden">
        <CardHeader title="Gap matrix" description="A check indicates the partner carries the attribute." />
        <div className="overflow-x-auto">
          <table className="gc-table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white">Attribute</th>
                {cols.map((p) => (
                  <th key={p.id} className="text-center">
                    <Link href={`/partners/${p.id}`} className="hover:text-blue-600">{p.legalName.replace("[DEMO] ", "")}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SectionRow label="Identity" span={cols.length} />
              <tr>
                <td className="sticky left-0 bg-white font-medium text-slate-600">Business size</td>
                {cols.map((p) => (
                  <td key={p.id} className="text-center">
                    <StatusPill style={styleFor(BUSINESS_SIZE_STYLES, p.businessSize)} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-white font-medium text-slate-600">Facility clearance</td>
                {cols.map((p) => (
                  <td key={p.id} className="text-center text-sm text-slate-600">{p.facilityClearance ?? "—"}</td>
                ))}
              </tr>

              <MatrixSection label="Socioeconomic status" rows={matrix.socioeconomic} colCount={cols.length} />
              <MatrixSection label="NAICS capabilities" rows={matrix.capabilities} colCount={cols.length} />
              <MatrixSection label="Contract vehicles" rows={matrix.vehicles} colCount={cols.length} />

              <SectionRow label="Agreements" span={cols.length} />
              {matrix.agreements.map((row) => (
                <tr key={row.label}>
                  <td className="sticky left-0 bg-white font-medium text-slate-600">{row.label}</td>
                  {row.statuses.map((s, i) => (
                    <td key={i} className="text-center">
                      <StatusPill map={AGREEMENT_STYLES} value={s} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function SectionRow({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <td colSpan={span + 1} className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </td>
    </tr>
  );
}

function MatrixSection({
  label,
  rows,
  colCount,
}: {
  label: string;
  rows: Array<{ label: string; presence: boolean[] }>;
  colCount: number;
}) {
  return (
    <>
      <SectionRow label={label} span={colCount} />
      {rows.length === 0 ? (
        <tr>
          <td colSpan={colCount + 1} className="text-center text-sm text-slate-400">None recorded</td>
        </tr>
      ) : (
        rows.map((row) => (
          <tr key={row.label}>
            <td className="sticky left-0 bg-white font-medium text-slate-600">{row.label}</td>
            {row.presence.map((present, i) => (
              <td key={i} className="text-center">
                {present ? (
                  <Check className="mx-auto h-4 w-4 text-green-600" aria-label="Yes" />
                ) : (
                  <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="No" />
                )}
              </td>
            ))}
          </tr>
        ))
      )}
    </>
  );
}
