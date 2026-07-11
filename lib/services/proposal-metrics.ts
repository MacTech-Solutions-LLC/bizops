/**
 * Pure, dependency-free proposal metrics. No Prisma, no context — just data in,
 * data out — so the compliance-coverage math and alert logic are unit-testable
 * in isolation from the database.
 */

/** The subset of a requirement the coverage/alert math needs. */
export interface RequirementLike {
  status: string;
  refId?: string | null;
  ownerId?: string | null;
  volumeId?: string | null;
  responseSection?: string | null;
  mandatory?: boolean;
}

export interface CoverageStats {
  total: number;
  unassigned: number;
  assigned: number;
  inReview: number;
  complete: number;
  /** Percent of requirements that are no longer unassigned (0..100). */
  coveragePercent: number;
}

/**
 * Bucket requirements by lifecycle status and compute the coverage percent.
 * DRAFTED counts as "assigned" work-in-progress. Coverage = share of
 * requirements that have moved off UNASSIGNED (i.e. have a response owner).
 */
export function requirementCoverage(requirements: RequirementLike[]): CoverageStats {
  const total = requirements.length;
  let unassigned = 0;
  let assigned = 0;
  let inReview = 0;
  let complete = 0;

  for (const r of requirements) {
    switch (r.status) {
      case "UNASSIGNED":
        unassigned += 1;
        break;
      case "ASSIGNED":
      case "DRAFTED":
        assigned += 1;
        break;
      case "IN_REVIEW":
        inReview += 1;
        break;
      case "COMPLETE":
        complete += 1;
        break;
      default:
        // Unknown status is treated as unassigned for a conservative coverage read.
        unassigned += 1;
    }
  }

  const covered = total - unassigned;
  const coveragePercent = total === 0 ? 0 : Math.round((covered / total) * 100);

  return { total, unassigned, assigned, inReview, complete, coveragePercent };
}

/**
 * Requirements that lack an owner and a volume assignment — the compliance gaps
 * a proposal manager must close. A requirement is flagged when its status is
 * UNASSIGNED or it has neither an owner nor a volume.
 */
export function unassignedAlerts<T extends RequirementLike>(requirements: T[]): T[] {
  return requirements.filter(
    (r) => r.status === "UNASSIGNED" || (!r.ownerId && !r.volumeId),
  );
}

/**
 * Mandatory requirements with no mapped response section — a traceability gap
 * (the requirement is not yet answered anywhere in the proposal).
 */
export function missingResponseAlerts<T extends RequirementLike>(requirements: T[]): T[] {
  return requirements.filter(
    (r) => (r.mandatory ?? true) && !(r.responseSection && r.responseSection.trim()),
  );
}
