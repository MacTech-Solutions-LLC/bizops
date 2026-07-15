"use client";

import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

/**
 * Pieces shared by the resume review step and the manual profile editor.
 *
 * They are the same form seen twice — one seeded from an extraction, one from
 * the database — and both post the same payload shape to sibling actions. Kept
 * in one place so an error-reporting fix lands on both.
 */

export function SourceBadge({ source }: { source: string }) {
  if (source === "manual") return null;
  const isAI = source === "ai";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1",
        isAI
          ? "bg-violet-50 text-violet-700 ring-violet-200"
          : "bg-slate-50 text-slate-600 ring-slate-200",
      )}
      title={
        isAI
          ? "Extracted by AI from your resume. Check it before saving."
          : "Matched directly from your resume text."
      }
    >
      {isAI ? <Sparkles className="h-2.5 w-2.5" /> : null}
      {isAI ? "AI" : "Matched"}
    </span>
  );
}

export function SubmitButton({
  children,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...rest}>
      {pending ? "Working…" : children}
    </Button>
  );
}

/** Validation paths → the labels the member actually sees on these screens. */
const FIELD_LABELS: Record<string, string> = {
  headline: "Professional title",
  summary: "Professional summary",
  laborCategory: "Labor category",
  yearsExperience: "Years of experience",
  clearanceLevel: "Clearance level",
  skills: "Skills",
  certifications: "Certifications",
  education: "Education",
  experience: "Experience",
};

/**
 * Turn a Zod path into something a member can act on. `experience.0.endedOn`
 * means nothing to them, and the row it names is the first entry under
 * "Experience" — so say that.
 */
export function humanisePath(path: string): string {
  const [head, index, field] = path.split(".");
  const section = FIELD_LABELS[head] ?? head;
  if (index === undefined) return section;
  const row = Number(index);
  const position = Number.isNaN(row) ? "" : ` (item ${row + 1})`;
  return field ? `${section}${position} — ${field}` : `${section}${position}`;
}

/**
 * Render server-side validation issues.
 *
 * The generic "Please correct the highlighted fields" was a dead end: the review
 * screen never rendered `issues`, so nothing was ever highlighted, and the
 * failing path was usually a nested row with no input to correct. Show the
 * issues explicitly, keyed to what's on screen — and never promise highlighting
 * we can't deliver.
 */
export function IssueList({ issues }: { issues?: Record<string, string[]> }) {
  const entries = Object.entries(issues ?? {});
  if (entries.length === 0) return null;
  return (
    <ul className="mt-1.5 list-inside list-disc space-y-0.5">
      {entries.map(([path, messages]) => (
        <li key={path}>
          <span className="font-medium">{humanisePath(path)}</span>: {messages.join(", ")}
        </li>
      ))}
    </ul>
  );
}

/** Field-level errors for the scalar inputs these screens do render. */
export function fieldError(issues: Record<string, string[]> | undefined, name: string) {
  return issues?.[name];
}

export function ErrorBanner({
  state,
}: {
  state: { error?: string; issues?: Record<string, string[]> };
}) {
  if (!state.error) return null;
  return (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
      <p>{state.error}</p>
      <IssueList issues={state.issues} />
    </div>
  );
}
