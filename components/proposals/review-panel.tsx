"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import {
  FINDING_STATUS_STYLES,
  REVIEW_TYPE_STYLES,
  SEVERITY_STYLES,
} from "@/lib/ui/status";
import { formatDate } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import {
  addFindingAction,
  closeReviewAction,
  resolveFindingAction,
  scheduleReviewAction,
  type FormState,
} from "@/app/(app)/proposals/[id]/actions";

export interface ReviewFinding {
  id: string;
  summary: string;
  detail: string | null;
  severity: string;
  ownerId: string | null;
  resolution: string | null;
  status: string;
}

export interface ReviewItem {
  id: string;
  type: string;
  status: string;
  scheduledAt: string | null;
  closedAt: string | null;
  scope: string | null;
  reviewers: string[];
  instructions: string | null;
  findings: ReviewFinding[];
}

const REVIEW_TYPE_OPTIONS = Object.entries(REVIEW_TYPE_STYLES).map(([value, s]) => ({
  value,
  label: s.label,
}));
const SEVERITY_OPTIONS = Object.entries(SEVERITY_STYLES).map(([value, s]) => ({
  value,
  label: s.label,
}));
const FINDING_STATUS_OPTIONS = Object.entries(FINDING_STATUS_STYLES).map(([value, s]) => ({
  value,
  label: s.label,
}));

export function ReviewPanel({
  proposalId,
  reviews,
  canManage,
  canReview,
}: {
  proposalId: string;
  reviews: ReviewItem[];
  canManage: boolean;
  canReview: boolean;
}) {
  const [scheduling, setScheduling] = useState(false);

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setScheduling((s) => !s)}>
            <Plus className="h-4 w-4" /> Schedule review
          </Button>
        </div>
      ) : null}

      {canManage && scheduling ? (
        <ScheduleReviewForm proposalId={proposalId} onDone={() => setScheduling(false)} />
      ) : null}

      {reviews.length === 0 && !scheduling ? (
        <EmptyState
          title="No color reviews yet"
          description="Schedule Blue, Pink, Red, Gold, or White Glove reviews to track findings and resolutions."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              proposalId={proposalId}
              review={r}
              canManage={canManage}
              canReview={canReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  proposalId,
  review,
  canManage,
  canReview,
}: {
  proposalId: string;
  review: ReviewItem;
  canManage: boolean;
  canReview: boolean;
}) {
  const [addingFinding, setAddingFinding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isClosed = review.status === "COMPLETE" || review.status === "CANCELED";
  const openFindings = review.findings.filter(
    (f) => f.status !== "RESOLVED" && f.status !== "CLOSED" && f.status !== "WONT_FIX",
  ).length;

  function close() {
    setError(null);
    startTransition(async () => {
      const res = await closeReviewAction(review.id, proposalId);
      if (!res.ok) setError(res.error ?? "Could not close review");
    });
  }

  function resolve(findingId: string, status: string) {
    setError(null);
    startTransition(async () => {
      const res = await resolveFindingAction(findingId, status, proposalId);
      if (!res.ok) setError(res.error ?? "Could not update finding");
    });
  }

  return (
    <div className="gc-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusPill map={REVIEW_TYPE_STYLES} value={review.type} />
          <span className="text-xs text-slate-500">
            {review.scheduledAt ? formatDate(review.scheduledAt) : "Unscheduled"}
          </span>
          {isClosed ? (
            <span className="text-xs text-green-600">Closed {formatDate(review.closedAt)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {openFindings} open / {review.findings.length} finding{review.findings.length === 1 ? "" : "s"}
          </span>
          {canManage && !isClosed ? (
            <Button variant="secondary" size="sm" onClick={close} disabled={pending}>
              Close review
            </Button>
          ) : null}
        </div>
      </div>

      {review.scope ? <p className="mt-2 text-sm text-slate-600">{review.scope}</p> : null}
      {review.reviewers.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {review.reviewers.map((rid) => (
            <span key={rid} className="flex items-center gap-1 text-xs text-slate-500">
              <Avatar name={rid} id={rid} size="sm" />
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {/* Findings */}
      <div className="mt-3 space-y-2">
        {review.findings.map((f) => (
          <div
            key={f.id}
            className={cn(
              "rounded-lg border border-slate-200 p-2.5",
              (f.status === "OPEN" || f.status === "IN_PROGRESS") && "bg-slate-50",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">{f.summary}</p>
                {f.detail ? <p className="mt-0.5 text-xs text-slate-500">{f.detail}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusPill map={SEVERITY_STYLES} value={f.severity} />
                <StatusPill map={FINDING_STATUS_STYLES} value={f.status} />
              </div>
            </div>
            {canReview ? (
              <div className="mt-2 flex items-center justify-end">
                <select
                  aria-label="Finding status"
                  value={f.status}
                  disabled={pending}
                  onChange={(e) => resolve(f.id, e.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                >
                  {FINDING_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {canReview ? (
        <div className="mt-3">
          {addingFinding ? (
            <AddFindingForm
              proposalId={proposalId}
              reviewId={review.id}
              onDone={() => setAddingFinding(false)}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAddingFinding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add finding
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ScheduleReviewForm({ proposalId, onDone }: { proposalId: string; onDone: () => void }) {
  const [state, formAction] = useFormState<FormState, FormData>(scheduleReviewAction, { ok: false });
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);
  return (
    <form action={formAction} className="gc-card space-y-3 p-4">
      <input type="hidden" name="proposalId" value={proposalId} />
      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Review type" name="type">
          <Select name="type" options={REVIEW_TYPE_OPTIONS} defaultValue="PINK" />
        </FormField>
        <FormField label="Scheduled date" name="scheduledAt">
          <TextInput name="scheduledAt" type="date" />
        </FormField>
        <FormField label="Reviewers (comma-separated Hub user ids)" name="reviewers" className="sm:col-span-2">
          <TextInput name="reviewers" placeholder="user_1, user_2" />
        </FormField>
        <FormField label="Scope" name="scope" className="sm:col-span-2">
          <TextInput name="scope" />
        </FormField>
        <FormField label="Instructions" name="instructions" className="sm:col-span-2">
          <TextArea name="instructions" rows={2} />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton label="Schedule review" pendingLabel="Scheduling…" />
      </div>
    </form>
  );
}

function AddFindingForm({
  proposalId,
  reviewId,
  onDone,
}: {
  proposalId: string;
  reviewId: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(addFindingAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);
  return (
    <form action={formAction} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="reviewId" value={reviewId} />
      {state.error ? (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Summary" name="summary" required error={err("summary")} className="sm:col-span-2">
          <TextInput name="summary" required />
        </FormField>
        <FormField label="Severity" name="severity">
          <Select name="severity" options={SEVERITY_OPTIONS} defaultValue="MEDIUM" />
        </FormField>
        <FormField label="Owner (Hub user id)" name="ownerId">
          <TextInput name="ownerId" />
        </FormField>
        <FormField label="Detail" name="detail" className="sm:col-span-2">
          <TextArea name="detail" rows={2} />
        </FormField>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton label="Add finding" pendingLabel="Adding…" />
      </div>
    </form>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}
