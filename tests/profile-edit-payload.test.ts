import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProfilePayload,
  toEditorState,
  toMonthInput,
  type StoredProfile,
} from "@/lib/profile/edit-payload";
import { saveMemberProfileSchema } from "@/lib/validation/member-profile";

/**
 * THE SEAM TEST, manual-edit edition.
 *
 * Same reasoning as `resume-review-payload.test.ts`: the editor's real state
 * goes through the real payload builder into the real schema. The round trip
 * (stored profile → editor → payload → schema → stored shape) is the thing that
 * has to hold, because that is what a member does every time they open the
 * editor and press Save without touching anything.
 */

const STORED: StoredProfile = {
  headline: "Senior Cybersecurity Engineer",
  summary: "Leads cybersecurity requirements for DoD space systems.",
  laborCategory: "Information Systems Security Manager",
  yearsExperience: 19,
  clearanceLevel: "top_secret",
  naicsCodes: ["541512", "541330"],
  skills: [
    {
      name: "RMF",
      category: "Security",
      proficiency: "expert",
      yearsExperience: null,
      source: "ai",
      confirmed: true,
    },
  ],
  certifications: [
    {
      name: "CISSP",
      issuer: null,
      identifier: null,
      issuedOn: new Date(Date.UTC(2018, 0, 1)),
      expiresOn: null,
      source: "heuristic",
      confirmed: true,
    },
  ],
  education: [
    {
      institution: "Salve Regina University",
      degree: "M.A.",
      field: "Administration of Justice",
      completedOn: new Date(Date.UTC(2013, 4, 1)),
      source: "ai",
      confirmed: true,
    },
  ],
  experience: [
    {
      organization: "Northrop Grumman",
      role: "Manager Systems Engineering",
      startedOn: new Date(Date.UTC(2022, 10, 1)),
      endedOn: null,
      summary: "Leads a team of 13 senior systems engineers.",
      isFederal: true,
      agency: "U.S. Space Force",
      contractName: null,
      source: "ai",
      confirmed: true,
    },
  ],
};

test("a stored profile round-trips through the editor unchanged", () => {
  const payload = buildProfilePayload(toEditorState(STORED));
  const parsed = saveMemberProfileSchema.parse(payload);

  assert.equal(parsed.headline, STORED.headline);
  assert.equal(parsed.yearsExperience, 19);
  assert.equal(parsed.clearanceLevel, "top_secret");
  assert.deepEqual(parsed.certifications[0].issuedOn, new Date(Date.UTC(2018, 0, 1)));
  assert.deepEqual(parsed.education[0].completedOn, new Date(Date.UTC(2013, 4, 1)));
  assert.deepEqual(parsed.experience[0].startedOn, new Date(Date.UTC(2022, 10, 1)));
  // An ongoing role: null endedOn must survive as null, not become a date.
  assert.equal(parsed.experience[0].endedOn, null);
});

test("a month input the member typed becomes a UTC first-of-month date", () => {
  const state = toEditorState(STORED);
  state.experience[0].endedOn = "2024-03";
  const parsed = saveMemberProfileSchema.parse(buildProfilePayload(state));
  assert.deepEqual(parsed.experience[0].endedOn, new Date(Date.UTC(2024, 2, 1)));
});

test("a date the member mistyped is reported, not silently dropped", () => {
  // The contrast with partialDateToDate, which absorbs machine-extracted junk:
  // here the member is looking at the field and can fix it.
  const state = toEditorState(STORED);
  state.experience[0].startedOn = "March 2022";
  const result = saveMemberProfileSchema.safeParse(buildProfilePayload(state));
  assert.equal(result.success, false);
  assert.match(result.error?.issues[0]?.message ?? "", /month and year/i);
});

test("clearing a field saves as null rather than leaving the old value", () => {
  const state = toEditorState(STORED);
  state.headline = "";
  state.yearsExperience = "";
  const parsed = saveMemberProfileSchema.parse(buildProfilePayload(state));
  assert.equal(parsed.headline, null);
  assert.equal(parsed.yearsExperience, null);
});

test("a row the member emptied is dropped rather than failing the save", () => {
  const state = toEditorState(STORED);
  state.skills.push({
    name: "   ",
    category: null,
    proficiency: "proficient",
    yearsExperience: "",
    source: "manual",
    confirmed: true,
  });
  const parsed = saveMemberProfileSchema.parse(buildProfilePayload(state));
  assert.equal(parsed.skills.length, 1);
});

test("a removed row is absent from the payload, so the save deletes it", () => {
  const state = toEditorState(STORED);
  state.experience = [];
  const parsed = saveMemberProfileSchema.parse(buildProfilePayload(state));
  assert.deepEqual(parsed.experience, []);
});

test("toMonthInput reads the stored date in UTC", () => {
  // A local-time round trip would walk this back to 2019-12 west of Greenwich.
  assert.equal(toMonthInput(new Date(Date.UTC(2020, 0, 1))), "2020-01");
  assert.equal(toMonthInput(null), "");
});
