import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getOpportunity } from "@/lib/services/opportunities";
import { getBidDecision } from "@/lib/services/bid-decisions";
import { listActivity } from "@/lib/services/activity";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { mergeBidCriteria } from "@/lib/domain/bid-criteria";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import {
  BidScorecard,
  ReviewersPanel,
  RecordDecisionPanel,
  type CriterionRow,
  type ReviewRow,
  type DecisionAuditRow,
} from "@/components/bid/bid-scorecard";

export const metadata: Metadata = { title: "Bid / No-Bid" };
export const dynamic = "force-dynamic";

export default async function BidPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();

  let opp;
  try {
    opp = await getOpportunity(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const decision = await getBidDecision(ctx, opp.id);
  const activity = await listActivity(ctx, { opportunityId: opp.id, limit: 50 });

  const canReview = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_BID_DECISION_REVIEW);
  const canApprove = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_BID_DECISION_APPROVE);

  const storedCriteria =
    (decision?.criteriaJson as Array<{ key: string; weight?: number; score?: number; max?: number }> | null) ??
    null;
  const criteria: CriterionRow[] = mergeBidCriteria(storedCriteria);

  const reviews: ReviewRow[] = (decision?.reviews ?? []).map((r) => ({
    id: r.id,
    reviewerId: r.reviewerId,
    vote: r.vote,
    approved: r.approved,
    comments: r.comments,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
  }));

  const auditHistory: DecisionAuditRow[] = activity
    .filter((a) => a.action === "bid.decision_recorded")
    .map((a) => ({
      id: a.id,
      summary: a.summary,
      actorId: a.actorId,
      createdAt: a.createdAt.toISOString(),
    }));

  return (
    <>
      <div className="mb-4">
        <Link href={`/opportunities/${opp.id}`} className="text-sm text-blue-600 hover:underline">
          ← {opp.internalName}
        </Link>
      </div>
      <PageHeader title="Bid / No-Bid Decision" subtitle={opp.internalName} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Decision scorecard" description="Weighted criteria (0–5). Advisory only." />
            <div className="p-4">
              <BidScorecard opportunityId={opp.id} canReview={canReview} criteria={criteria} />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader title="Record decision" description="A human sets the outcome." />
            <div className="p-4">
              <RecordDecisionPanel
                opportunityId={opp.id}
                canApprove={canApprove}
                currentOutcome={decision?.outcome ?? "PENDING"}
                decidedBy={decision?.decidedBy ?? null}
                decidedAt={decision?.decidedAt ? decision.decidedAt.toISOString() : null}
                rationale={decision?.rationale ?? null}
                auditHistory={auditHistory}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title={`Reviewers (${reviews.length})`} description="Votes and approvals." />
            <div className="p-4">
              <ReviewersPanel opportunityId={opp.id} canReview={canReview} reviews={reviews} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
