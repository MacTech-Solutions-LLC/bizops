import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePartialDate } from "@/lib/resume/dates";
import { applyResumeProposalSchema } from "@/lib/validation/member-profile";

const iso = (d: Date | null) => (d === null ? null : d.toISOString().slice(0, 10));

// --- "ongoing" means null, not a parse failure ------------------------------
//
// Regression: a member could not save their profile at all. The model returned
// "Present" for a current role's endedOn, the strict parser rejected it, and the
// whole submission failed with "Please correct the highlighted fields" pointing
// at experience.0.endedOn — a field the review UI never renders. Unfixable.

test("ongoing markers resolve to null (an unfinished role has no end date)", () => {
  for (const v of ["Present", "present", "Current", "now", "Ongoing", "To date", "PRESENT"]) {
    assert.equal(parsePartialDate(v), null, `${v} should mean "still going"`);
  }
});

test("a range ending in Present is ongoing — not the start year", () => {
  // The year is present in the string, but the role hasn't ended. Ongoing must
  // win over year extraction or a current job gets stamped as ended in 2019.
  assert.equal(parsePartialDate("2019 - Present"), null);
  assert.equal(parsePartialDate("Jan 2019 – Current"), null);
});

// --- shapes resumes actually use -------------------------------------------

test("parses ISO and partial ISO", () => {
  assert.equal(iso(parsePartialDate("2019")), "2019-01-01");
  assert.equal(iso(parsePartialDate("2019-06")), "2019-06-01");
  assert.equal(iso(parsePartialDate("2019-06-15")), "2019-06-15");
  assert.equal(iso(parsePartialDate("2019/06/15")), "2019-06-15");
});

test("parses month/year forms", () => {
  assert.equal(iso(parsePartialDate("06/2019")), "2019-06-01");
  assert.equal(iso(parsePartialDate("6/2019")), "2019-06-01");
  assert.equal(iso(parsePartialDate("June 2019")), "2019-06-01");
  assert.equal(iso(parsePartialDate("Jun 2019")), "2019-06-01");
  assert.equal(iso(parsePartialDate("Sept 2019")), "2019-09-01");
  assert.equal(iso(parsePartialDate("December, 2019")), "2019-12-01");
});

test("a year range yields the END year (the field asks when it ended)", () => {
  assert.equal(iso(parsePartialDate("2019-2021")), "2021-01-01");
});

test("extracts the stated year without inventing a month", () => {
  // `new Date("Summer 2019")` silently yields 1 January — a guess wearing a
  // timestamp. We take the year that IS stated and go no further.
  assert.equal(iso(parsePartialDate("Summer 2019")), "2019-01-01");
});

test("unreadable input is null, never a fabricated date", () => {
  for (const v of ["", "   ", "n/a", "TBD", "sometime", "—"]) {
    assert.equal(parsePartialDate(v), null, `${JSON.stringify(v)} should be null`);
  }
});

test("implausible years are rejected rather than stored", () => {
  assert.equal(parsePartialDate("0007"), null);
  assert.equal(parsePartialDate("3200"), null);
  assert.equal(parsePartialDate("2019-13"), null, "month 13 is not a month");
});

test("passes through a real Date and rejects an invalid one", () => {
  const d = new Date("2019-06-01T00:00:00Z");
  assert.equal(parsePartialDate(d)?.getTime(), d.getTime());
  assert.equal(parsePartialDate(new Date("nonsense")), null);
  assert.equal(parsePartialDate(null), null);
  assert.equal(parsePartialDate(undefined), null);
});

test("parsePartialDate never throws, whatever it is handed", () => {
  for (const v of ["Present", "!!!", "2019-99-99", "٢٠١٩", "1/1/1/1"]) {
    assert.doesNotThrow(() => parsePartialDate(v), `threw on ${v}`);
  }
});

// --- the schema must absorb all of it --------------------------------------

test("a proposal with 'Present' now validates instead of blocking the save", () => {
  const result = applyResumeProposalSchema.safeParse({
    clearanceLevel: "none",
    experience: [
      { organization: "Booz Allen", role: "Architect", startedOn: "2019-01", endedOn: "Present", isFederal: true },
    ],
  });
  assert.ok(result.success, "the exact payload that used to hard-fail must now save");
  assert.equal(result.data.experience[0].endedOn, null, "ongoing role → null end date");
  assert.equal(iso(result.data.experience[0].startedOn ?? null), "2019-01-01");
});

test("an unreadable date drops that field rather than rejecting the whole profile", () => {
  const result = applyResumeProposalSchema.safeParse({
    clearanceLevel: "none",
    certifications: [{ name: "CISSP", issuedOn: "whenever", expiresOn: null }],
    experience: [{ organization: "Acme", endedOn: "garbage", isFederal: false }],
  });
  assert.ok(result.success, "one bad optional date must not block an entire submission");
  assert.equal(result.data.certifications[0].issuedOn, null);
  assert.equal(result.data.certifications[0].name, "CISSP", "the row itself survives");
});

test("required fields still fail — leniency is scoped to dates only", () => {
  const result = applyResumeProposalSchema.safeParse({
    clearanceLevel: "none",
    experience: [{ organization: "", isFederal: false }],
  });
  assert.ok(!result.success, "a missing organization is still a real error");
});
