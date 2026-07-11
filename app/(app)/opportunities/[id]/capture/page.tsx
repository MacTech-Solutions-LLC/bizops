import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getOpportunity } from "@/lib/services/opportunities";
import { getCapturePlanForOpportunity } from "@/lib/services/capture";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { CaptureForm } from "@/components/capture/capture-form";
import { CaptureSections, type SectionRow } from "@/components/capture/capture-sections";
import { PrintButton } from "@/components/capture/print-button";

export const metadata: Metadata = { title: "Capture Plan" };
export const dynamic = "force-dynamic";

export default async function CapturePage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();

  let opp;
  try {
    opp = await getOpportunity(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const canEdit = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CAPTURE_MANAGE);
  // Only auto-create the plan when the actor can manage it; viewers just read.
  const planRaw = await getCapturePlanForOpportunity(ctx, opp.id, canEdit);
  const plan = planRaw ? serialize(planRaw) : null;

  const sections: SectionRow[] = (plan?.sections ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    body: s.body,
    status: s.status,
    ownerId: s.ownerId,
    approvedBy: s.approvedBy,
    approvedAt: s.approvedAt ? s.approvedAt.toISOString() : null,
    lockedAt: s.lockedAt ? s.lockedAt.toISOString() : null,
    version: s.version,
  }));

  return (
    <>
      <div className="mb-4 print:hidden">
        <Link href={`/opportunities/${opp.id}`} className="text-sm text-blue-600 hover:underline">
          ← {opp.internalName}
        </Link>
      </div>
      <PageHeader
        title="Capture Plan"
        subtitle={opp.internalName}
        actions={<PrintButton />}
      >
        <p className="mt-1 text-xs text-slate-400 print:block">
          Printable — use your browser print dialog to export this capture plan.
        </p>
      </PageHeader>

      {!canEdit ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 print:hidden">
          You have read-only access to this capture plan.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CaptureForm
            opportunityId={opp.id}
            canEdit={canEdit}
            values={{
              version: plan?.version,
              ownerId: plan?.ownerId ?? null,
              customerMission: plan?.customerMission ?? null,
              customerProblem: plan?.customerProblem ?? null,
              acquisitionContext: plan?.acquisitionContext ?? null,
              procurementHistory: plan?.procurementHistory ?? null,
              incumbentAnalysis: plan?.incumbentAnalysis ?? null,
              competitiveLandscape: plan?.competitiveLandscape ?? null,
              stakeholderMap: plan?.stakeholderMap ?? null,
              relationshipMap: plan?.relationshipMap ?? null,
              decisionRoles: plan?.decisionRoles ?? null,
              strengths: plan?.strengths ?? null,
              weaknesses: plan?.weaknesses ?? null,
              competitorStrengths: plan?.competitorStrengths ?? null,
              competitorWeaknesses: plan?.competitorWeaknesses ?? null,
              discriminators: plan?.discriminators ?? null,
              winThemes: plan?.winThemes ?? null,
              ghostThemes: plan?.ghostThemes ?? null,
              proofPoints: plan?.proofPoints ?? null,
              pastPerformanceAlignment: plan?.pastPerformanceAlignment ?? null,
              teamingGaps: plan?.teamingGaps ?? null,
              staffingGaps: plan?.staffingGaps ?? null,
              technicalGaps: plan?.technicalGaps ?? null,
              readinessGaps: plan?.readinessGaps ?? null,
              pricingPosture: plan?.pricingPosture ?? null,
              captureActions: plan?.captureActions ?? null,
            }}
          />
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader title={`Capture sections (${sections.length})`} description="Structured, approvable narrative blocks." />
            <CaptureSections opportunityId={opp.id} canEdit={canEdit} sections={sections} />
          </Card>
        </div>
      </div>
    </>
  );
}
