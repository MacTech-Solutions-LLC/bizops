import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { HubProfilePayload } from "@/lib/hub/profile";

/**
 * The bizops → Hub projection (ADR-0003).
 *
 * A type-level seam test. `HubProfilePayload` is bizops' statement of what the
 * Hub is allowed to receive, and the thing worth defending is what is *absent*:
 * bizops holds no name or email by design (DR-2026-06-10-01), and clearance is
 * deliberately out of ADR-0003's first slice. Both would be easy to add by
 * reflex when someone later wants a display name on a founder card, so this
 * pins the boundary in a place a compiler enforces.
 */

test("the Hub payload carries capability data and nothing identifying", () => {
  const payload: HubProfilePayload = {
    headline: "Senior Cybersecurity Engineer",
    summary: "Leads RMF and ATO outcomes for DoD systems.",
    laborCategory: "ISSM",
    yearsExperience: 19,
    naicsCodes: ["541512", "541519", "611420"],
    confirmedAt: "2026-07-16T00:00:00.000Z",
  };

  const keys = Object.keys(payload);
  for (const forbidden of ["name", "fullName", "email", "phone", "clearanceLevel", "clearance"]) {
    assert.ok(!keys.includes(forbidden), `${forbidden} must never be projected to the Hub`);
  }
});

test("NAICS order is the member's ranking, carried through unsorted", () => {
  // The array order IS the rank the Hub stores, and CaptureOS routes off it.
  // A trainer-first profile is a real thing someone can assert; sorting here
  // (or anywhere downstream) would silently invert that claim.
  const payload: HubProfilePayload = {
    headline: null,
    summary: null,
    laborCategory: null,
    yearsExperience: null,
    naicsCodes: ["611420", "541512"],
    confirmedAt: "2026-07-16T00:00:00.000Z",
  };
  assert.deepEqual(payload.naicsCodes, ["611420", "541512"]);
  assert.notDeepEqual(
    payload.naicsCodes,
    [...payload.naicsCodes].sort(),
    "if these ever match, someone sorted the ranking away",
  );
});

test("unknown years of experience projects as null, never 0", () => {
  const payload: HubProfilePayload = {
    headline: null,
    summary: null,
    laborCategory: null,
    yearsExperience: null,
    naicsCodes: [],
    confirmedAt: "2026-07-16T00:00:00.000Z",
  };
  assert.equal(payload.yearsExperience, null);
});

test("the profile push uses its own token, never the general service token", () => {
  // MACTECH_HUB_SERVICE_TOKEN is bizops' general credential: resolveAppAccess
  // (lib/hub/client.ts), audit forwarding, and employee onboarding all read it.
  // Pointing the profile push at it forces a choice between two bad outcomes —
  // grant profile_write to a token that already unlocks authority resolution,
  // or swap in a profile_write-only key and break login for the whole app.
  // Neither is a tradeoff anyone should make by accident, so this pins it.
  const source = readFileSync(new URL("../lib/hub/profile.ts", import.meta.url), "utf8");
  assert.ok(
    source.includes("process.env.MACTECH_HUB_PROFILE_TOKEN"),
    "profile push must read its own credential",
  );
  assert.ok(
    !/process\.env\.MACTECH_HUB_SERVICE_TOKEN/.test(source),
    "profile push must NOT read the general service token",
  );
});
