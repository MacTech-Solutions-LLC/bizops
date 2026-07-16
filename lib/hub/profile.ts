/**
 * Push the member's confirmed capability profile to the Hub (ADR-0003 phase 3).
 *
 * bizops owns the member-facing confirmation flow, so bizops is the writer. The
 * Hub is the reader other apps go to — CaptureOS first — which is what stops the
 * same person being described by hand in two systems.
 *
 * Called over plain REST rather than through `hub-client`. The ADR names REST as
 * the contract precisely because the first consumer's API is Python and
 * `hub-client` is a TypeScript package; sending this call the same way CaptureOS
 * will means the contract is exercised by both languages identically, and it
 * avoids re-vendoring a package into this repo for a single PUT. If a second TS
 * caller ever appears, a typed wrapper is worth adding then — not for one route.
 *
 * Best-effort, exactly like `emitHubAuditEvent` in `lib/audit.ts`: a member must
 * always be able to save their own profile, and a Hub outage is not their
 * problem. A failure is logged for reconciliation, never surfaced as a save
 * error. The consequence is real and accepted — the Hub can lag bizops — so the
 * failure log carries what a reconciler would need to replay it.
 *
 * Note what is NOT sent: no name, no email (bizops does not hold them — identity
 * is the Hub's), and no clearance (ADR-0003 keeps it out of the first slice; it
 * should arrive with its own review rather than riding along with a headline).
 */

import { APP_KEY, getHubAuthorityMode } from "@/lib/hub/client";
import { logger } from "@/lib/logger";

/** The subset of a member profile the Hub owns. */
export interface HubProfilePayload {
  headline: string | null;
  summary: string | null;
  laborCategory: string | null;
  yearsExperience: number | null;
  /** Strongest first. Position is the ranking the Hub stores. */
  naicsCodes: string[];
  /** When the member confirmed this. */
  confirmedAt: string;
}

function hubBaseUrl(): string | null {
  return process.env.MACTECH_HUB_URL?.replace(/\/$/, "") ?? null;
}

/**
 * PUT the profile to the Hub. Resolves to whether it landed.
 *
 * Never throws: every caller is on the member's save path, and this call is not
 * allowed to fail that. Callers should not await it on the critical path either
 * — see `pushProfileToHubInBackground`.
 */
export async function pushProfileToHub(
  hubUserId: string,
  payload: HubProfilePayload,
): Promise<boolean> {
  if (getHubAuthorityMode() !== "live") return false;

  const base = hubBaseUrl();
  const token = process.env.MACTECH_HUB_SERVICE_TOKEN;
  if (!base || !token) {
    logger.warn("hub_profile_push_unconfigured", {
      hasUrl: Boolean(base),
      hasToken: Boolean(token),
    });
    return false;
  }

  const res = await fetch(`${base}/api/hub/profiles/${encodeURIComponent(hubUserId)}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      // Same header the Hub's other service-to-service routes accept.
      authorization: `Bearer ${token}`,
      "x-mactech-service-app": APP_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Deliberately does not log the response body: on a 400 the Hub echoes the
    // offending fields, which here are the member's own profile contents.
    logger.warn("hub_profile_push_rejected", {
      hubUserId,
      status: res.status,
      naicsCount: payload.naicsCodes.length,
      // A reconciler replays from bizops' own row, so it needs the id and the
      // fact of failure — not the payload.
      reconcile: true,
    });
    return false;
  }

  return true;
}

/**
 * Fire-and-forget wrapper for the save path.
 *
 * The member's profile is already committed locally by the time this runs; the
 * Hub copy is a projection. Blocking a save on a cross-service call would trade
 * a guarantee the member cares about (their profile saved) for one they don't
 * (another app sees it this second).
 */
export function pushProfileToHubInBackground(
  hubUserId: string,
  payload: HubProfilePayload,
): void {
  if (getHubAuthorityMode() !== "live") return;

  void pushProfileToHub(hubUserId, payload).catch((err) => {
    logger.exception("hub_profile_push_failed", err, {
      hubUserId,
      // Same signal as a failed audit forward: the Hub is now behind bizops for
      // this user, and something has to catch up.
      reconcile: true,
    });
  });
}
