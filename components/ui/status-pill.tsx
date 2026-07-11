import { cn } from "@/lib/ui/cn";
import { styleFor, type StatusStyle } from "@/lib/ui/status";

/**
 * Status pill. The text label is the primary indicator (color is secondary), so
 * meaning survives for colorblind and screen-reader users. Pass either a
 * resolved `style` or a `map` + `value` to look one up.
 */
export function StatusPill({
  style,
  map,
  value,
  className,
}: {
  style?: StatusStyle;
  map?: Record<string, StatusStyle>;
  value?: string | null;
  className?: string;
}) {
  const resolved = style ?? (map ? styleFor(map, value) : undefined);
  if (!resolved) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        resolved.pill,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", resolved.dot)} aria-hidden="true" />
      {resolved.label}
    </span>
  );
}
