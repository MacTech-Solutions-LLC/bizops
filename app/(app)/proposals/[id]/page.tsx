import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getProposal } from "@/lib/services/proposals";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { VOLUME_STATUS_STYLES } from "@/lib/ui/status";
import { formatDate } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";
import { VolumesPanel, type PanelVolume } from "@/components/proposals/volumes-panel";
import { ComplianceMatrix, type RequirementRow } from "@/components/proposals/compliance-matrix";
import { ReviewPanel, type ReviewItem } from "@/components/proposals/review-panel";
import { VolumeBoard, type BoardVolume } from "@/components/proposals/volume-board";

export const metadata: Metadata = { title: "Proposal" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "volumes", label: "Volumes" },
  { key: "compliance", label: "Compliance" },
  { key: "reviews", label: "Reviews" },
  { key: "board", label: "Board" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function toISO(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export default async function ProposalDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const ctx = await requireGovConContext();
  let proposal;
  try {
    proposal = await getProposal(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE);
  const canReview = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_REVIEW);
  const canExport = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_EXPORT);

  const rawTab = Array.isArray(searchParams.tab) ? searchParams.tab[0] : searchParams.tab;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "volumes";

  const requirementCountByVolume = new Map<string, number>();
  for (const r of proposal.requirements) {
    if (r.volumeId) {
      requirementCountByVolume.set(r.volumeId, (requirementCountByVolume.get(r.volumeId) ?? 0) + 1);
    }
  }

  const panelVolumes: PanelVolume[] = proposal.volumes.map((v) => ({
    id: v.id,
    name: v.name,
    ownerId: v.ownerId,
    reviewerId: v.reviewerId,
    status: v.status,
    dueAt: toISO(v.dueAt),
    pageLimit: v.pageLimit,
    currentPages: v.currentPages,
    outline: v.outline,
    orderIndex: v.orderIndex,
    requirementCount: v.requirements.length,
  }));

  const boardVolumes: BoardVolume[] = proposal.volumes.map((v) => ({
    id: v.id,
    name: v.name,
    ownerId: v.ownerId,
    status: v.status,
    dueAt: toISO(v.dueAt),
    pageLimit: v.pageLimit,
    currentPages: v.currentPages,
    requirementCount: v.requirements.length,
  }));

  const requirementRows: RequirementRow[] = proposal.requirements.map((r) => ({
    id: r.id,
    refId: r.refId,
    sourceSection: r.sourceSection,
    text: r.text,
    requirementType: r.requirementType,
    mandatory: r.mandatory,
    volumeId: r.volumeId,
    responseSection: r.responseSection,
    ownerId: r.ownerId,
    status: r.status,
    evidence: r.evidence,
  }));

  const volumeOptions = proposal.volumes.map((v) => ({ id: v.id, name: v.name }));

  const reviewItems: ReviewItem[] = proposal.reviews.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    scheduledAt: toISO(r.scheduledAt),
    closedAt: toISO(r.closedAt),
    scope: r.scope,
    reviewers: r.reviewers,
    instructions: r.instructions,
    findings: r.findings.map((f) => ({
      id: f.id,
      summary: f.summary,
      detail: f.detail,
      severity: f.severity,
      ownerId: f.ownerId,
      resolution: f.resolution,
      status: f.status,
    })),
  }));

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <Link href="/proposals" className="text-sm text-blue-600 hover:underline">
          ← Proposal Room
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{proposal.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              <Link href={`/opportunities/${proposal.opportunityId}`} className="hover:text-blue-600">
                {proposal.opportunity.internalName}
              </Link>
              {proposal.opportunity.solicitationNumber
                ? ` · ${proposal.opportunity.solicitationNumber}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill map={VOLUME_STATUS_STYLES} value={proposal.status} />
            <span className="text-sm text-slate-500">Due {formatDate(proposal.dueAt)}</span>
            {canManage ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/proposals/${proposal.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/proposals/${proposal.id}?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "volumes" ? (
        <VolumesPanel proposalId={proposal.id} volumes={panelVolumes} canManage={canManage} />
      ) : null}
      {tab === "compliance" ? (
        <ComplianceMatrix
          proposalId={proposal.id}
          requirements={requirementRows}
          volumes={volumeOptions}
          canManage={canManage}
          canExport={canExport}
        />
      ) : null}
      {tab === "reviews" ? (
        <ReviewPanel
          proposalId={proposal.id}
          reviews={reviewItems}
          canManage={canManage}
          canReview={canReview}
        />
      ) : null}
      {tab === "board" ? (
        <VolumeBoard proposalId={proposal.id} volumes={boardVolumes} canManage={canManage} />
      ) : null}
    </>
  );
}
