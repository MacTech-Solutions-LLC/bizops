import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

/** Horizontal progress bar. `value`/`max` drive both width and aria. */
export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full bg-blue-500 transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Empty state with an optional call to action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      {icon ? <div className="text-slate-300">{icon}</div> : null}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Error state — distinct from empty so users know it's an operational failure. */
export function ErrorState({
  title = "Something went wrong",
  description = "This data could not be loaded. Please retry.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-semibold text-red-700">{title}</p>
      <p className="max-w-sm text-sm text-red-600">{description}</p>
    </div>
  );
}

/** Permission-denied state. */
export function PermissionState({ description }: { description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">Restricted</p>
      <p className="max-w-sm text-sm text-slate-500">
        {description ?? "You do not have permission to view this."}
      </p>
    </div>
  );
}

/** Page header with title, optional subtitle, and actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Small labelled value for detail grids. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}
