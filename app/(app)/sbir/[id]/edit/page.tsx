import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getTopic } from "@/lib/services/sbir";
import { listAgencyOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { toNumber } from "@/lib/domain/metrics";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { SbirForm } from "@/components/sbir/sbir-form";

export const metadata: Metadata = { title: "Edit SBIR Topic" };
export const dynamic = "force-dynamic";

export default async function EditSbirTopicPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_SBIR_MANAGE)) {
    return (
      <>
        <PageHeader title="Edit SBIR Topic" />
        <PermissionState description="You need SBIR management permission to edit topics." />
      </>
    );
  }
  let topic;
  try {
    topic = await getTopic(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const agencies = await listAgencyOptions(ctx);
  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <>
      <PageHeader title="Edit SBIR Topic" subtitle={`${topic.topicNumber} — ${topic.topicTitle}`} />
      <SbirForm
        mode="edit"
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        values={{
          id: topic.id,
          program: topic.program,
          component: topic.component,
          agencyId: topic.agencyId,
          topicNumber: topic.topicNumber,
          topicTitle: topic.topicTitle,
          phase: topic.phase,
          preReleaseDate: iso(topic.preReleaseDate),
          openDate: iso(topic.openDate),
          questionsDeadline: iso(topic.questionsDeadline),
          closeDate: iso(topic.closeDate),
          technicalPoc: topic.technicalPoc,
          contractingPoc: topic.contractingPoc,
          objective: topic.objective,
          description: topic.description,
          phaseIExpectations: topic.phaseIExpectations,
          phaseIIExpectations: topic.phaseIIExpectations,
          phaseIIITransition: topic.phaseIIITransition,
          trl: topic.trl,
          deliverables: topic.deliverables,
          awardRangeMin: topic.awardRangeMin ? toNumber(topic.awardRangeMin) : null,
          awardRangeMax: topic.awardRangeMax ? toNumber(topic.awardRangeMax) : null,
          periodOfPerformanceMonths: topic.periodOfPerformanceMonths,
          eligibilityNotes: topic.eligibilityNotes,
          dataRightsNotes: topic.dataRightsNotes,
          requiredRegistrations: topic.requiredRegistrations,
          submissionPortal: topic.submissionPortal,
          sourceUrl: topic.sourceUrl,
          stage: topic.stage,
        }}
      />
    </>
  );
}
