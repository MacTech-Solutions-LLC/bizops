import assert from "node:assert/strict";
import { test } from "node:test";
import { optionalNullableText, optionalNumber } from "@/lib/validation/common";

/**
 * These validators are shared by readiness, opportunity, proposal, vehicle,
 * sbir, and member-profile. They are built for FormData — where every value is
 * a string and null cannot occur — which is why `optionalNullableText` rejects
 * null by design. That contract is fine; it just has to be a *known* contract,
 * because reusing these on a JSON payload (where null is normal) silently
 * failed in production.
 */

test("optionalNumber treats an explicit null as unknown, NOT as zero", () => {
  // Regression: the union listed z.coerce.number() first, and it accepts null
  // by coercing it (Number(null) === 0). So "unknown" was silently stored as a
  // real, asserted 0 — e.g. "0 years of experience" on a capability statement.
  // z.null() must be matched before any coercing branch.
  assert.equal(optionalNumber.parse(null), null);
});

test("optionalNumber still handles the FormData shapes its callers send", () => {
  assert.equal(optionalNumber.parse(""), null, "cleared field → null");
  assert.equal(optionalNumber.parse("12"), 12, "numeric string coerces");
  assert.equal(optionalNumber.parse(12), 12);
  assert.equal(optionalNumber.parse(undefined), undefined, "absent → omit from write");
});

test("optionalNumber rejects an unparseable string rather than nulling it", () => {
  // Deliberate and correct for its FormData callers: a member who typed "abc"
  // in a number field should be told, not silently have it discarded. This is
  // the opposite of the resume payload's contract, where values are
  // machine-extracted and leniency is right — hence the separate validator.
  assert.equal(optionalNumber.safeParse("abc").success, false);
});

test("optionalNumber coerces booleans — a latent sharp edge, documented", () => {
  // Number(true) === 1, so a boolean silently becomes a number. No caller can
  // hit this today (FormData yields "on"/"" for a checkbox, which fails to
  // parse, and the JSON payload path uses jsonNullableInt instead), so this is
  // documented rather than changed — tightening a validator shared by six
  // schemas isn't warranted by a bug nothing can currently reach.
  assert.equal(optionalNumber.parse(true), 1);
  assert.equal(optionalNumber.parse(false), 0);
});

test("optionalNullableText rejects null — it is a FormData validator", () => {
  // Documents the contract that caused the bug. JSON payloads must use a
  // null-accepting validator instead (see lib/validation/member-profile.ts).
  assert.equal(optionalNullableText.safeParse(null).success, false);
});

test("optionalNullableText handles its intended FormData shapes", () => {
  assert.equal(optionalNullableText.parse(""), null, "cleared → null");
  assert.equal(optionalNullableText.parse("  hi  "), "hi", "trims");
  assert.equal(optionalNullableText.parse(undefined), undefined, "absent → omit");
});
