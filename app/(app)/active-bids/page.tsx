import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listActiveBidsWithContext, rollupActiveBids } from "@/lib/services/bid-decisions";
import { formatCurrency, formatDate } from "@/lib/ui/format";
import { Card } from "@/components/ui/card";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/misc";
import { BidCard } from "@/components/active-bids/bid-card";
import { cn } from "@/lib/ui/cn";

export const metadata: Metadata = { title: "Active Bids" };
export const dynamic = "force-dynamic";

/**
 * A portfolio-level figure. Deliberately not KpiCard — these summarise the list
 * below rather than linking elsewhere, so link affordances would mislead.
 */
function Stat({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "slate" | "blue" | "amber";
}) {
  const bar = { slate: "bg-slate-300", blue: "bg-blue-500", amber: "bg-amber-400" }[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={cn("absolute inset-x-0 top-0 h-1", bar)} aria-hidden="true" />
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function relativeDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

export default async function ActiveBidsPage() {
  const ctx = await requireGovConContext();

  let body: React.ReactNode;
  let subtitle = "Every bid with a price on the street — what it's worth, when it's due, what's blocked.";

  try {
    const bids = await listActiveBidsWithContext(ctx);

    if (bids.length === 0) {
      body = (
        <Card>
          <EmptyState
            title="No bids on the street"
            description="Pursuits appear here once they reach bid/no-bid, proposal, submitted, or evaluation."
          />
        </Card>
      );
    } else {
      const roll = rollupActiveBids(bids);
      const gateDays = roll.nextGate?.days ?? null;

      subtitle =
        `${roll.count} ${roll.count === 1 ? "bid" : "bids"} on the street · ` +
        `${formatCurrency(roll.atStake)} at stake` +
        (roll.contingent > 0 ? ` · ${formatCurrency(roll.contingent)} priced but unelected` : "");

      body = (
        <div className="space-y-5">
          <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="At stake"
              value={formatCurrency(roll.atStake)}
              hint={`Basis of bid across ${roll.count} ${roll.count === 1 ? "bid" : "bids"}`}
              tone="blue"
            />
            <Stat
              label="Contingent"
              value={roll.contingent > 0 ? `+${formatCurrency(roll.contingent)}` : "—"}
              hint="Adders and alternates, priced but unelected"
            />
            <Stat
              label="Next gate"
              value={relativeDays(gateDays)}
              hint={
                roll.nextGate?.milestone
                  ? `${formatDate(roll.nextGate.milestone.dueAt)} · ${roll.nextGate.bid.internalName}`
                  : "Nothing on the calendar"
              }
              tone={gateDays !== null && gateDays <= 14 ? "amber" : "slate"}
            />
            <Stat
              label="Open items"
              value={String(roll.openItems)}
              hint={
                roll.criticalRisks > 0
                  ? `${roll.criticalRisks} critical or high risks live`
                  : "No critical or high risks live"
              }
              tone={roll.openItems > 0 ? "amber" : "slate"}
            />
          </section>

          <section aria-label="Active bids" className="space-y-3">
            {bids.map((bid) => (
              <BidCard key={bid.id} bid={bid} />
            ))}
          </section>
        </div>
      );
    }
  } catch {
    body = <ErrorState title="Active bids unavailable" />;
  }

  return (
    <>
      <PageHeader title="Active Bids" subtitle={subtitle} />
      {body}
    </>
  );
}
