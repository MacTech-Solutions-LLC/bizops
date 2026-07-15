import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CircleAlert, FileText } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { formatCurrency, formatDate } from "@/lib/ui/format";
import { toNumber } from "@/lib/domain/metrics";
import {
  BID_OUTCOME_STYLES,
  HEALTH_STYLES,
  STAGE_STYLES,
  TEAM_ROLE_STYLES,
} from "@/lib/ui/status";
import { StatusPill } from "@/components/ui/status-pill";
import type { ActiveBidListItem } from "@/lib/services/bid-decisions";

/**
 * Urgency tone for the gate chip. Thresholds are calendar days to the next gate:
 * past due is red, inside two weeks is amber (a bid gate needs lead time — a
 * "due tomorrow" warning is useless), otherwise neutral.
 */
function gateTone(days: number | null): { chip: string; icon: string; urgent: boolean } {
  if (days === null) return { chip: "bg-slate-50 text-slate-600 ring-slate-200", icon: "text-slate-400", urgent: false };
  if (days < 0) return { chip: "bg-red-50 text-red-700 ring-red-200", icon: "text-red-500", urgent: true };
  if (days <= 14) return { chip: "bg-amber-50 text-amber-800 ring-amber-200", icon: "text-amber-500", urgent: true };
  return { chip: "bg-slate-50 text-slate-600 ring-slate-200", icon: "text-slate-400", urgent: false };
}

function gateLabel(days: number | null): string {
  if (days === null) return "no date set";
  if (days === 0) return "today";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

/** One figure + its label. The label says what the number means, not its units. */
function Figure({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: "default" | "muted" | "contingent";
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "truncate text-lg font-semibold tabular-nums",
          tone === "default" && "text-slate-900",
          tone === "contingent" && "text-slate-600",
          tone === "muted" && "text-slate-500",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-slate-500">{label}</p>
    </div>
  );
}

/**
 * One active bid, sized to answer three questions without a click: how much is
 * at stake, when is the next gate, and what is blocked right now.
 */
export function BidCard({ bid }: { bid: ActiveBidListItem }) {
  const tone = gateTone(bid.daysToGate);
  const agency = bid.agency?.abbreviation ?? bid.agency?.name ?? null;
  const topItems = bid.tasks.slice(0, 2);
  const moreItems = bid.tasks.length - topItems.length;
  const { critical, high, total } = bid.riskCounts;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      {tone.urgent ? (
        <span className="absolute inset-y-0 left-0 w-1 bg-amber-400" aria-hidden="true" />
      ) : null}

      <div className="p-4 sm:p-5">
        {/* Identity */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              <Link
                href={`/active-bids/${bid.id}`}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 after:absolute after:inset-0 after:content-['']"
              >
                {bid.internalName}
              </Link>
            </h3>
            <p className="mt-1 truncate text-xs text-slate-500">
              {[bid.solicitationNumber, agency, bid.placeOfPerformance].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <StatusPill map={STAGE_STYLES} value={bid.stage} />
            <StatusPill map={HEALTH_STYLES} value={bid.health} />
          </div>
        </div>

        {/* Money + posture */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure value={formatCurrency(toNumber(bid.estimatedValue))} label="Basis of bid" />
          <Figure
            value={bid.contingent > 0 ? `+${formatCurrency(bid.contingent)}` : "—"}
            label={bid.contingent > 0 ? "Contingent, priced" : "No contingent adders"}
            tone="contingent"
          />
          <div className="min-w-0">
            <StatusPill map={BID_OUTCOME_STYLES} value={bid.bidDecision?.outcome ?? "PENDING"} />
            <p className="mt-1.5 truncate text-xs text-slate-500">Decision</p>
          </div>
          <div className="min-w-0">
            <StatusPill map={TEAM_ROLE_STYLES} value={bid.teamRole} />
            <p className="mt-1.5 truncate text-xs text-slate-500">Our role</p>
          </div>
        </div>

        {/* The clock */}
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5">
          <CalendarClock className={cn("h-4 w-4 shrink-0", tone.icon)} aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-xs text-slate-600">
            {bid.nextGate ? (
              <>
                <span className="font-medium text-slate-800">{bid.nextGate.title}</span>
                <span className="text-slate-400"> · {formatDate(bid.nextGate.dueAt)}</span>
              </>
            ) : (
              <span className="text-slate-500">No gate on the calendar</span>
            )}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ring-1 ring-inset",
              tone.chip,
            )}
          >
            {gateLabel(bid.daysToGate)}
          </span>
        </div>

        {/* What's blocked */}
        {topItems.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {topItems.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-xs">
                <CircleAlert
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    t.priority === "CRITICAL" ? "text-red-500" : "text-slate-300",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-slate-600">{t.title}</span>
                <span className="shrink-0 text-slate-400">
                  {blockedOnFrom(t.tags) ?? "unassigned"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Footer counts */}
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex min-w-0 items-center gap-3">
            <span className="whitespace-nowrap">
              {bid.tasks.length} open{moreItems > 0 ? ` (${moreItems} more)` : ""}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <AlertTriangle
                className={cn("h-3.5 w-3.5", critical > 0 ? "text-red-500" : high > 0 ? "text-orange-400" : "text-slate-300")}
                aria-hidden="true"
              />
              {total} risks
              {critical + high > 0 ? (
                <span className="text-slate-400">
                  ({[critical > 0 ? `${critical} critical` : null, high > 0 ? `${high} high` : null]
                    .filter(Boolean)
                    .join(", ")})
                </span>
              ) : null}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <FileText className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              {bid.artifactCount} artifacts
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-1 font-medium text-blue-600 transition-transform group-hover:translate-x-0.5">
            Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Recover the blocked-on party from the tag the ingest writes. */
export function blockedOnFrom(tags: string[]): string | null {
  const tag = tags.find((t) => t.startsWith("blocked-on:"));
  return tag ? tag.slice("blocked-on:".length) : null;
}
