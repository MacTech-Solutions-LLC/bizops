/** Display formatters. Server + client safe (no locale surprises). */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $1,250,000 — compact when large. Returns "—" for null/0-less inputs. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return USD.format(value);
}

/** Full currency, no abbreviation (for detail views). */
export function formatCurrencyFull(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return USD.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

/** Relative day count, e.g. "in 5d", "today", "3d ago". */
export function formatDueRelative(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): { label: string; overdue: boolean; soon: boolean } {
  if (!value) return { label: "—", overdue: false, soon: false };
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return { label: "—", overdue: false, soon: false };
  const days = Math.round((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return { label: "today", overdue: false, soon: true };
  if (days < 0) return { label: `${Math.abs(days)}d ago`, overdue: true, soon: false };
  return { label: `in ${days}d`, overdue: false, soon: days <= 7 };
}

/** Convert an ENUM_VALUE to Title Case words. */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
