/** Calendar agenda — merges upcoming milestones + opportunity deadlines. */

import { prisma } from "@/lib/db/prisma";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";

export type CalendarKind = "milestone" | "proposal_deadline" | "questions_deadline";

export interface CalendarEntry {
  id: string;
  kind: CalendarKind;
  title: string;
  date: Date;
  opportunity: { id: string; internalName: string } | null;
}

/**
 * Upcoming agenda for the next `days` days across the tenant: not-completed
 * milestones with a due date, plus each active pursuit's proposal + questions
 * deadlines. Sorted ascending by date.
 */
export async function getCalendarAgenda(
  ctx: GovConContext,
  days = 60,
): Promise<CalendarEntry[]> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const [milestones, opportunities] = await Promise.all([
    prisma.govConMilestone.findMany({
      where: {
        hubOrganizationId: ctx.tenantOrgId,
        status: { in: ["PENDING", "SCHEDULED"] },
        dueAt: { gte: now, lte: until },
      },
      include: { opportunity: { select: { id: true, internalName: true } } },
    }),
    prisma.govConOpportunity.findMany({
      where: {
        hubOrganizationId: ctx.tenantOrgId,
        archivedAt: null,
        OR: [
          { proposalDeadline: { gte: now, lte: until } },
          { questionsDeadline: { gte: now, lte: until } },
        ],
      },
      select: {
        id: true,
        internalName: true,
        proposalDeadline: true,
        questionsDeadline: true,
      },
    }),
  ]);

  const entries: CalendarEntry[] = [];

  for (const m of milestones) {
    if (!m.dueAt) continue;
    entries.push({
      id: `milestone:${m.id}`,
      kind: "milestone",
      title: m.title,
      date: m.dueAt,
      opportunity: m.opportunity ? { id: m.opportunity.id, internalName: m.opportunity.internalName } : null,
    });
  }

  for (const o of opportunities) {
    const opp = { id: o.id, internalName: o.internalName };
    if (o.questionsDeadline && o.questionsDeadline >= now && o.questionsDeadline <= until) {
      entries.push({
        id: `questions:${o.id}`,
        kind: "questions_deadline",
        title: `Questions due — ${o.internalName}`,
        date: o.questionsDeadline,
        opportunity: opp,
      });
    }
    if (o.proposalDeadline && o.proposalDeadline >= now && o.proposalDeadline <= until) {
      entries.push({
        id: `proposal:${o.id}`,
        kind: "proposal_deadline",
        title: `Proposal due — ${o.internalName}`,
        date: o.proposalDeadline,
        opportunity: opp,
      });
    }
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  return entries;
}
