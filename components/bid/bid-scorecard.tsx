"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import { BID_CRITERION_MAX } from "@/lib/domain/bid-criteria";
import {
  recordDecisionAction,
  saveCriteriaAction,
  submitReviewAction,
} from "@/app/(app)/opportunities/[id]/bid/actions";

export interface CriterionRow {
  key: string;
  label: string;
  group: string;
  hint?: string;
  weight: number;
  score: number;
  max: number;
}

export interface ReviewRow {
  id: string;
  reviewerId: string;
  vote: string;
  approved: boolean | null;
  comments: string | null;
  reviewedAt: string | null;
}

export interface DecisionAuditRow {
  id: string;
  summary: string | null;
  actorId: string | null;
  createdAt: string;
}

const OUTCOME_OPTIONS = [
  { value: "BID", label: "Bid" },
  { value: "CONDITIONAL_BID", label: "Conditional Bid" },
  { value: "HOLD", label: "Hold" },
  { value: "NO_BID", label: "No-Bid" },
];

const VOTE_OPTIONS = [{ value: "PENDING", label: "Pending" }, ...OUTCOME_OPTIONS];

function liveTotals(rows: CriterionRow[]) {
  let weighted = 0;
  let maxScore = 0;
  for (const r of rows) {
    const w = Math.max(0, r.weight);
    weighted += w * Math.max(0, Math.min(r.max, r.score));
    maxScore += w * r.max;
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    weighted: round2(weighted),
    maxScore: round2(maxScore),
    percent: maxScore > 0 ? round2((weighted / maxScore) * 100) : 0,
  };
}

// --- Scorecard --------------------------------------------------------------

export function BidScorecard({
  opportunityId,
  canReview,
  criteria,
}: {
  opportunityId: string;
  canReview: boolean;
  criteria: CriterionRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CriterionRow[]>(criteria);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => liveTotals(rows), [rows]);

  const groups = useMemo(() => {
    const map = new Map<string, CriterionRow[]>();
    for (const r of rows) {
      const list = map.get(r.group) ?? [];
      list.push(r);
      map.set(r.group, list);
    }
    return [...map.entries()];
  }, [rows]);

  function setScore(key: string, score: number) {
    setSaved(false);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, score } : r)));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCriteriaAction(
        opportunityId,
        rows.map((r) => ({ key: r.key, weight: r.weight, score: r.score, max: r.max })),
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save scorecard");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        The weighted score is <strong>advisory only</strong>. It informs the bid discussion but never
        decides — a human records the final outcome below.
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Advisory weighted score
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {totals.weighted}
              <span className="text-base font-normal text-slate-400"> / {totals.maxScore}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Normalized</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{totals.percent}%</div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${totals.percent}%` }} />
        </div>
      </div>

      {groups.map(([group, list]) => (
        <div key={group} className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{group}</div>
          <div className="divide-y divide-slate-100">
            {list.map((r) => (
              <div key={r.key} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700">{r.label}</div>
                  {r.hint ? <div className="text-xs text-slate-400">{r.hint}</div> : null}
                </div>
                <span className="shrink-0 text-xs text-slate-400">×{r.weight}</span>
                <input
                  type="range"
                  min={0}
                  max={r.max}
                  step={1}
                  value={r.score}
                  disabled={!canReview}
                  onChange={(e) => setScore(r.key, Number(e.target.value))}
                  className="w-28 accent-blue-600"
                  aria-label={`${r.label} score`}
                />
                <span className="w-10 shrink-0 text-right text-sm font-semibold text-slate-800">
                  {r.score}/{r.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {saved ? <p className="text-xs text-green-600">Scorecard saved.</p> : null}
      {canReview ? (
        <div className="flex justify-end">
          <Button disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save scorecard"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">You have read-only access to this scorecard.</p>
      )}
    </div>
  );
}

// --- Reviewers --------------------------------------------------------------

export function ReviewersPanel({
  opportunityId,
  canReview,
  reviews,
}: {
  opportunityId: string;
  canReview: boolean;
  reviews: ReviewRow[];
}) {
  const router = useRouter();
  const [reviewerId, setReviewerId] = useState("");
  const [vote, setVote] = useState("PENDING");
  const [approved, setApproved] = useState(false);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitReviewAction(opportunityId, {
        reviewerId,
        vote,
        approved,
        comments,
      });
      if (res.ok) {
        setReviewerId("");
        setComments("");
        setVote("PENDING");
        setApproved(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not submit review");
      }
    });
  }

  return (
    <div className="space-y-3">
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400">No reviews submitted yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {reviews.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">{r.reviewerId}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{r.vote}</span>
                  {r.approved === true ? (
                    <span className="text-green-600">Approved</span>
                  ) : r.approved === false ? (
                    <span className="text-red-600">Rejected</span>
                  ) : null}
                </span>
              </div>
              {r.comments ? <p className="mt-0.5 text-xs text-slate-500">{r.comments}</p> : null}
            </li>
          ))}
        </ul>
      )}

      {canReview ? (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3 print:hidden">
          <FormField label="Reviewer (Hub user id)" name="reviewerId">
            <TextInput value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Vote" name="vote">
              <Select options={VOTE_OPTIONS} value={vote} onChange={(e) => setVote(e.target.value)} />
            </FormField>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
              Approve
            </label>
          </div>
          <FormField label="Comments" name="comments">
            <TextArea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end">
            <Button size="sm" disabled={pending || !reviewerId.trim()} onClick={submit}>
              {pending ? "Saving…" : "Submit review"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --- Record decision --------------------------------------------------------

export function RecordDecisionPanel({
  opportunityId,
  canApprove,
  currentOutcome,
  decidedBy,
  decidedAt,
  rationale,
  auditHistory,
}: {
  opportunityId: string;
  canApprove: boolean;
  currentOutcome: string;
  decidedBy: string | null;
  decidedAt: string | null;
  rationale: string | null;
  auditHistory: DecisionAuditRow[];
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [nextRationale, setNextRationale] = useState("");
  const [requiredApprovers, setRequiredApprovers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function record() {
    setError(null);
    startTransition(async () => {
      const res = await recordDecisionAction(opportunityId, {
        outcome,
        rationale: nextRationale,
        requiredApprovers,
      });
      if (res.ok) {
        setOutcome("");
        setNextRationale("");
        setRequiredApprovers("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not record decision");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Current outcome</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">{currentOutcome}</div>
        {decidedBy ? (
          <p className="text-xs text-slate-400">
            Decided by {decidedBy}
            {decidedAt ? ` on ${new Date(decidedAt).toLocaleDateString()}` : ""}
          </p>
        ) : (
          <p className="text-xs text-slate-400">No final decision recorded yet.</p>
        )}
        {rationale ? <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{rationale}</p> : null}
      </div>

      {canApprove ? (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3 print:hidden">
          <p className="text-xs text-slate-500">
            The outcome is set by you, the approver — the advisory score never decides.
          </p>
          <FormField label="Decision outcome" name="outcome">
            <Select
              options={OUTCOME_OPTIONS}
              placeholder="— choose outcome —"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </FormField>
          <FormField label="Rationale" name="rationale">
            <TextArea rows={3} value={nextRationale} onChange={(e) => setNextRationale(e.target.value)} />
          </FormField>
          <FormField label="Required approvers (comma-separated Hub ids)" name="requiredApprovers">
            <TextInput value={requiredApprovers} onChange={(e) => setRequiredApprovers(e.target.value)} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending || !outcome} onClick={record}>
              {pending ? "Recording…" : "Record decision"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Recording a final decision requires approval permission.</p>
      )}

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Approval history</div>
        {auditHistory.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">No decisions recorded.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {auditHistory.map((a) => (
              <li key={a.id} className="text-xs text-slate-500">
                <span className="text-slate-700">{a.summary ?? "Decision recorded"}</span>
                {a.actorId ? ` · ${a.actorId}` : ""} · {new Date(a.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
