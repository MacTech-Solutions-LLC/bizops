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
 * The profile-write credential — deliberately its own env var.
 *
 * NOT `MACTECH_HUB_SERVICE_TOKEN`. That one is bizops' general service token and
 * carries the scopes `resolveAppAccess` (lib/hub/client.ts), audit forwarding
 * (lib/audit.ts), and employee onboarding need. Reusing it here would force one
 * of two bad outcomes: either this key gets `profile_write` *added* to a token
 * that already unlocks authority resolution — so a leak here is a leak of
 * everything — or someone swaps in a `profile_write`-only key and silently
 * breaks login for the whole app.
 *
 * A separate variable keeps the blast radius of a profile-write leak to
 * profiles, and lets it rotate on its own schedule. It is also the only scope
 * here that can change data a member confirmed about themselves.
 */
function profileWriteToken(): string | undefined {
  return process.env.MACTECH_HUB_PROFILE_TOKEN;
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
  const token = profileWriteToken();
  if (!base || !token) {
    // Unconfigured is not an error: the Hub write is additive to a profile that
    // is already saved locally, so a deployment without the key degrades to
    // "bizops-only" rather than failing a member's save.
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
 * The profile-READ credential — its own env var, `profile_read` scope.
 *
 * Separate from `MACTECH_HUB_PROFILE_TOKEN` (write) for the same blast-radius
 * reason that key is separate from the general service token: reading the
 * suite's canonical copy of a profile and overwriting it are different powers
 * and rotate on different schedules. A capability-statement draft only needs to
 * *read*, so it carries only the read key.
 */
function profileReadToken(): string | undefined {
  return process.env.MACTECH_HUB_PROFILE_READ_TOKEN;
}

/**
 * The Hub's canonical copy of a member's capability profile — the same record
 * bizops writes with `pushProfileToHub`, read back.
 *
 * This is the "fetched from other apps in the suite" half of ADR-0003: bizops
 * is the writer, but the Hub is where the *suite-wide* truth lives, and a
 * capability statement should reflect that truth, not just this app's local row
 * (which can lag, or predate another app's edit). The naicsCodes order is the
 * Hub's stored rank.
 */
export interface HubProfileSnapshot extends HubProfilePayload {}

/**
 * GET the member's own profile back from the Hub. Resolves to null on anything
 * other than a clean hit.
 *
 * Best-effort by design, exactly like the write path: the capability statement
 * must be draftable from local data alone, so a Hub outage, a missing key, or
 * mock mode degrades to "no suite data this time" rather than failing the
 * member's generate. Never throws.
 */
export async function fetchProfileFromHub(
  hubUserId: string,
): Promise<HubProfileSnapshot | null> {
  if (getHubAuthorityMode() !== "live") return null;

  const base = hubBaseUrl();
  const token = profileReadToken();
  if (!base || !token) {
    logger.warn("hub_profile_read_unconfigured", {
      hasUrl: Boolean(base),
      hasToken: Boolean(token),
    });
    return null;
  }

  try {
    const res = await fetch(`${base}/api/hub/profiles/${encodeURIComponent(hubUserId)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "x-mactech-service-app": APP_KEY,
      },
    });

    // A member with no Hub copy yet (404) is the normal first-run case, not an
    // error — they simply have nothing to sync down.
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.warn("hub_profile_read_rejected", { hubUserId, status: res.status });
      return null;
    }

    const body = (await res.json()) as Partial<HubProfileSnapshot> | null;
    if (!body || typeof body !== "object") return null;

    // Normalise defensively: this is a cross-service payload, and a draft that
    // reads `naicsCodes.map(...)` must not throw on a malformed field.
    return {
      headline: typeof body.headline === "string" ? body.headline : null,
      summary: typeof body.summary === "string" ? body.summary : null,
      laborCategory: typeof body.laborCategory === "string" ? body.laborCategory : null,
      yearsExperience: typeof body.yearsExperience === "number" ? body.yearsExperience : null,
      naicsCodes: Array.isArray(body.naicsCodes)
        ? body.naicsCodes.filter((c): c is string => typeof c === "string")
        : [],
      confirmedAt: typeof body.confirmedAt === "string" ? body.confirmedAt : "",
    };
  } catch (err) {
    logger.exception("hub_profile_read_failed", err, { hubUserId });
    return null;
  }
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
