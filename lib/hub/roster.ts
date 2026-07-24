/**
 * Read the org's member roster from the Hub.
 *
 * bizops deliberately stores no identity (DR-2026-06-10-01): members exist
 * locally only as opaque `hubUserId` join keys on capability data. The Hub is
 * the identity authority, so a Team roster — every member, with names, emails
 * and avatars, including people who have never opened bizops — must come from
 * `GET /api/v1/orgs/{orgId}/members` there.
 *
 * Best-effort like the other Hub reads: mock mode, a missing key, or a Hub
 * outage resolves to null and the caller degrades to what local capability
 * rows can show (hubUserIds with Directory-sourced names where available).
 * The roster must never take the Team page down with it. Never throws.
 */

import { APP_KEY, getHubAuthorityMode } from "@/lib/hub/client";
import { logger } from "@/lib/logger";

/** One org member as the Hub knows them. Identity is read, rendered, and
 * dropped — never written to a bizops table. */
export interface HubRosterMember {
  hubUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  /** Hub role string, e.g. "customer_admin" / "read_only_user". */
  role: string | null;
  membershipStatus: string | null;
  userStatus: string | null;
}

function hubBaseUrl(): string | null {
  return process.env.MACTECH_HUB_URL?.replace(/\/$/, "") ?? null;
}

/**
 * The roster-read credential — its own env var, `org_read` scope on the Hub.
 *
 * Same blast-radius reasoning as the profile read/write split in
 * `lib/hub/profile.ts`: listing who is in the org is a different power from
 * resolving authority (`MACTECH_HUB_SERVICE_TOKEN`) or writing profiles, and
 * it rotates on its own schedule.
 */
function rosterToken(): string | undefined {
  return process.env.MACTECH_HUB_ROSTER_TOKEN;
}

/** Display name from the Hub's identity fields; null when it holds none. */
export function rosterDisplayName(member: HubRosterMember): string | null {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return member.email;
}

/**
 * GET the org's members from the Hub. Resolves to null on anything other than
 * a clean hit — mock mode, unconfigured, outage, or a malformed body.
 */
export async function fetchOrgRoster(
  hubOrganizationId: string,
): Promise<HubRosterMember[] | null> {
  if (getHubAuthorityMode() !== "live") return null;

  const base = hubBaseUrl();
  const token = rosterToken();
  if (!base || !token) {
    logger.warn("hub_roster_read_unconfigured", {
      hasUrl: Boolean(base),
      hasToken: Boolean(token),
    });
    return null;
  }

  try {
    const res = await fetch(
      `${base}/api/v1/orgs/${encodeURIComponent(hubOrganizationId)}/members`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
          "x-mactech-service-app": APP_KEY,
        },
      },
    );

    if (!res.ok) {
      logger.warn("hub_roster_read_rejected", {
        hubOrganizationId,
        status: res.status,
      });
      return null;
    }

    const body = (await res.json()) as { members?: unknown } | null;
    if (!body || !Array.isArray(body.members)) return null;

    // Defensive normalisation of the cross-service payload: a malformed member
    // row degrades to nulls rather than throwing mid-render.
    return body.members
      .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === "object")
      .map((m) => ({
        hubUserId: typeof m.hubUserId === "string" ? m.hubUserId : "",
        email: typeof m.email === "string" ? m.email : null,
        firstName: typeof m.firstName === "string" ? m.firstName : null,
        lastName: typeof m.lastName === "string" ? m.lastName : null,
        imageUrl: typeof m.imageUrl === "string" ? m.imageUrl : null,
        role: typeof m.role === "string" ? m.role : null,
        membershipStatus: typeof m.membershipStatus === "string" ? m.membershipStatus : null,
        userStatus: typeof m.userStatus === "string" ? m.userStatus : null,
      }))
      .filter((m) => m.hubUserId !== "");
  } catch (err) {
    logger.exception("hub_roster_read_failed", err, { hubOrganizationId });
    return null;
  }
}
