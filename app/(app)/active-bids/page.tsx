import type { Metadata } from "next";
import Link from "next/link";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listActiveBidPursuits } from "@/lib/services/bid-decisions";
import { weightedValue } from "@/lib/domain/metrics";
import { formatCurrency, formatDate, formatPercent } from "@/lib/ui/format";
import { STAGE_STYLES, BID_OUTCOME_STYLES } from "@/lib/ui/status";
import { StatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Active Bids" };
export const dynamic = "force-dynamic";

export default async function ActiveBidsPage() {
  const ctx = await requireGovConContext();

  let body: React.ReactNode;
  try {
    const pursuits = await listActiveBidPursuits(ctx);
    if (pursuits.length === 0) {
      body = (
        <Card>
          <EmptyState
            title="No pursuits in the bid pipeline"
            description="Pursuits appear here once they reach bid/no-bid, proposal, submitted, or evaluation."
          />
        </Card>
      );
    } else {
      body = (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-medium">Pursuit</th>
                  <th className="px-4 py-2 font-medium">Agency</th>
                  <th className="px-4 py-2 font-medium">Stage</th>
                  <th className="px-4 py-2 font-medium">Bid decision</th>
                  <th className="px-4 py-2 text-right font-medium">PWin</th>
                  <th className="px-4 py-2 text-right font-medium">Weighted</th>
                  <th className="px-4 py-2 font-medium">Proposal due</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pursuits.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/opportunities/${o.id}/bid`} className="font-medium text-slate-800 hover:text-blue-600">
                        {o.internalName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {o.agency?.name?.replace("[DEMO] ", "") ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill map={STAGE_STYLES} value={o.stage} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill map={BID_OUTCOME_STYLES} value={o.bidDecision?.outcome ?? "PENDING"} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatPercent(o.pWin)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {formatCurrency(weightedValue(o.estimatedValue, o.pWin) || null)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(o.proposalDeadline)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/opportunities/${o.id}/bid`} className="text-xs text-blue-600 hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );
    }
  } catch {
    body = <ErrorState title="Active bids unavailable" />;
  }

  return (
    <>
      <PageHeader
        title="Active Bids"
        subtitle="What's in the bid pipeline — decision status, PWin, and deadlines."
      />
      {body}
    </>
  );
}
