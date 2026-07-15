import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getGovConContext } from '@/lib/auth/govcon-context';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getGovConContext();
  if (!ctx) return NextResponse.json({ error: 'hub_auth_required' }, { status: 403 });

  const topic = await prisma.govConSbirTopic.findFirst({
    where: { id: params.id, hubOrganizationId: ctx.tenantOrgId },
    include: { assessment: true, opportunity: { include: { outcome: true } } },
  });
  if (!topic) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const awarded = topic.opportunity?.stage === 'AWARDED' && topic.opportunity.outcome?.result === 'AWARDED';
  const packet = {
    packetVersion: 'bizops-sbir-finance-handoff-v1',
    hubOrganizationId: ctx.tenantOrgId,
    sourceApp: 'bizops',
    targetApp: 'finance',
    sourceRecordId: topic.id,
    opportunityId: topic.opportunityId,
    program: topic.program,
    phase: topic.phase,
    topicNumber: topic.topicNumber,
    topicTitle: topic.topicTitle,
    agencyComponent: topic.component,
    periodOfPerformanceMonths: topic.periodOfPerformanceMonths,
    awardDate: topic.opportunity?.actualAwardDate?.toISOString() ?? topic.opportunity?.outcome?.decidedAt?.toISOString() ?? null,
    awardedValue: topic.opportunity?.outcome?.awardedValue?.toString() ?? null,
    principalInvestigatorHubUserId: null,
    smallBusinessMinimumEffortPercent: null,
    researchInstitutionMinimumEffortPercent: null,
    maximumSubcontractEffortPercent: null,
    requiresHumanThresholdConfirmation: true,
    thresholdAuthorityNote: 'Confirm program, phase, solicitation, award, agency deviations, and current SBA requirements before activating Finance effort controls.',
    awardEvidenceReady: awarded,
    blockers: [
      ...(!awarded ? ['The linked opportunity and outcome are not both marked AWARDED.'] : []),
      'Principal investigator Hub user must be selected in the award handoff.',
      'Effort thresholds must be confirmed from the executed award and current applicable rules.',
    ],
    generatedAt: new Date().toISOString(),
  };
  const sourceSnapshotId = createHash('sha256').update(JSON.stringify(packet)).digest('hex');
  return NextResponse.json({ ...packet, sourceSnapshotId });
}
