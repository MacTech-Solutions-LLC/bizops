/**
 * Team roster merge + contribution coverage — pure, no I/O.
 *
 * The roster is a join across authorities: the Hub knows *who is in the org*
 * (identity — names, emails, avatars), bizops knows *what each person has
 * confirmed* (capability data — profile, resume parse provenance, capability
 * statement). This module merges the two by `hubUserId` and derives the alert
 * flags the Team pages render: no resume uploaded, no capability statement,
 * profile not published.
 *
 * The merge is deliberately union-shaped. A Hub member with no bizops profile
 * is exactly who the alerts exist for — they have contributed nothing to the
 * company statement. A local profile with no Hub roster row (Hub in mock mode,
 * roster fetch degraded, or a membership since removed) still shows, name
 * falling back through the Directory to the opaque id, so the page never
 * silently drops a contributor.
 */

import type { GovConProfileStatus } from "@prisma/client";
import { rosterDisplayName, type HubRosterMember } from "@/lib/hub/roster";

/** The local capability signals for one member, as queried by the service. */
export interface LocalMemberSignals {
  hubUserId: string;
  profileStatus: GovConProfileStatus;
  completeness: number;
  headline: string | null;
  laborCategory: string | null;
  /** Null when no resume has ever been parsed for this profile. */
  resumeParsedAt: Date | null;
  /** Null when the member has never confirmed a capability statement. */
  statementConfirmedAt: Date | null;
  profileUpdatedAt: Date;
}

/** Identity fallback from the Directory (INTERNAL contacts carry hubUserId). */
export interface DirectoryIdentity {
  hubUserId: string;
  name: string;
  email: string | null;
}

/** One row of the Team roster. */
export interface TeamRosterEntry {
  hubUserId: string;
  /** Best available display name: Hub identity → Directory → null (render the
   * opaque id). Never stored. */
  displayName: string | null;
  email: string | null;
  imageUrl: string | null;
  hubRole: string | null;
  /** Null when the member has never opened their bizops profile. */
  profileStatus: GovConProfileStatus | null;
  completeness: number;
  headline: string | null;
  laborCategory: string | null;
  // --- Contribution alerts ---
  hasResume: boolean;
  hasStatement: boolean;
  isPublished: boolean;
  /** Published + confirmed statement: fully feeding the company statement. */
  isContributing: boolean;
}

/** Org-level rollup of the alerts — the "ingestion coverage" panel. */
export interface TeamCoverage {
  total: number;
  contributing: number;
  missingResume: TeamRosterEntry[];
  missingStatement: TeamRosterEntry[];
  notPublished: TeamRosterEntry[];
}

export function mergeRoster(
  hubRoster: HubRosterMember[] | null,
  locals: LocalMemberSignals[],
  directory: DirectoryIdentity[],
): TeamRosterEntry[] {
  const localById = new Map(locals.map((l) => [l.hubUserId, l]));
  const directoryById = new Map(directory.map((d) => [d.hubUserId, d]));

  const entries: TeamRosterEntry[] = [];
  const seen = new Set<string>();

  const build = (
    hubUserId: string,
    hub: HubRosterMember | null,
  ): TeamRosterEntry => {
    const local = localById.get(hubUserId) ?? null;
    const dir = directoryById.get(hubUserId) ?? null;
    const hasResume = Boolean(local?.resumeParsedAt);
    const hasStatement = Boolean(local?.statementConfirmedAt);
    const isPublished = local?.profileStatus === "published";
    return {
      hubUserId,
      displayName: (hub ? rosterDisplayName(hub) : null) ?? dir?.name ?? null,
      email: hub?.email ?? dir?.email ?? null,
      imageUrl: hub?.imageUrl ?? null,
      hubRole: hub?.role ?? null,
      profileStatus: local?.profileStatus ?? null,
      completeness: local?.completeness ?? 0,
      headline: local?.headline ?? null,
      laborCategory: local?.laborCategory ?? null,
      hasResume,
      hasStatement,
      isPublished,
      isContributing: isPublished && hasStatement,
    };
  };

  for (const hub of hubRoster ?? []) {
    // Members whose Hub account is disabled aren't teammates to alert on.
    if (hub.userStatus === "suspended" || hub.membershipStatus === "inactive") continue;
    seen.add(hub.hubUserId);
    entries.push(build(hub.hubUserId, hub));
  }

  for (const local of locals) {
    if (seen.has(local.hubUserId)) continue;
    entries.push(build(local.hubUserId, null));
  }

  // Named members first (alphabetical), opaque ids last — stable and readable
  // whichever identity sources were available.
  return entries.sort((a, b) => {
    if (a.displayName && !b.displayName) return -1;
    if (!a.displayName && b.displayName) return 1;
    return (a.displayName ?? a.hubUserId).localeCompare(b.displayName ?? b.hubUserId);
  });
}

export function computeCoverage(entries: TeamRosterEntry[]): TeamCoverage {
  return {
    total: entries.length,
    contributing: entries.filter((e) => e.isContributing).length,
    missingResume: entries.filter((e) => !e.hasResume),
    missingStatement: entries.filter((e) => !e.hasStatement),
    notPublished: entries.filter((e) => !e.isPublished),
  };
}
