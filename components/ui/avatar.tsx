import { cn } from "@/lib/ui/cn";

/** Deterministic color from a string so a given user always gets the same hue. */
const PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-teal-100 text-teal-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-800",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  name,
  id,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  id?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const label = name || id || "Unassigned";
  const sizeCls = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        hueFor(label),
        sizeCls,
        className,
      )}
      title={label}
      aria-label={label}
    >
      {initials(label)}
    </span>
  );
}
