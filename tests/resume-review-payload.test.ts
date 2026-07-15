import assert from "node:assert/strict";
import { test } from "node:test";
import type { ResumeProposal } from "@/lib/resume";
import { buildProposalPayload, type ReviewSelection } from "@/lib/resume/review-payload";
import { applyResumeProposalSchema } from "@/lib/validation/member-profile";

/**
 * THE SEAM TEST.
 *
 * The review UI serialises a ResumeProposal; the server parses it with
 * applyResumeProposalSchema. Both sides had tests and both passed — but nothing
 * exercised them *together* against a realistic extraction, so two bugs shipped:
 * "Present" hard-failed the save, and null (the AI's "the resume didn't say")
 * was rejected as "Expected string, received null".
 *
 * The fixture below is deliberately AI-shaped: nulls everywhere the model is
 * instructed to use them rather than guess. Typed as ResumeProposal so the
 * compiler keeps it honest if the pipeline's shape changes.
 */

/** What `parseResume` actually returns for a real resume — nulls and all. */
const PROPOSAL: ResumeProposal = {
  headline: "Senior Cybersecurity Engineer",
  summary: "Leads cybersecurity requirements for DoD space systems.",
  laborCategory: "Information Systems Security Manager",
  yearsExperience: 12,
  clearance: { level: "ts_sci", evidence: "Active TS/SCI clearance with CI polygraph" },
  skills: [
    // The model routinely knows the skill but not the years or a category.
    { name: "RMF", category: "Security", proficiency: "expert", yearsExperience: null, source: "ai" },
    { name: "Splunk", category: null, proficiency: "proficient", yearsExperience: 5, source: "ai" },
  ],
  certifications: [
    // Matches the reported failure exactly: issuer/identifier null.
    { name: "CISSP", issuer: null, identifier: null, issuedOn: "2018", expiresOn: null, source: "heuristic" },
    { name: "CompTIA Security+", issuer: "CompTIA", identifier: null, issuedOn: null, expiresOn: null, source: "heuristic" },
  ],
  education: [
    { institution: "Salve Regina University", degree: "M.A.", field: "Administration of Justice", completedOn: "2013-05", source: "ai" },
    { institution: "Salve Regina University", degree: "B.A.", field: null, completedOn: "2011-05", source: "ai" },
  ],
  experience: [
    // A current role — the model writes "Present" despite being asked for null.
    { organization: "MacTech", role: "ISSM", startedOn: "2019-03", endedOn: "Present", summary: null, isFederal: true, agency: "U.S. Space Force", contractName: null, source: "ai" },
    // Commercial: no agency, no contract.
    { organization: "Acme Systems", role: "Engineer", startedOn: "2012", endedOn: "2014", summary: null, isFederal: false, agency: null, contractName: null, source: "ai" },
  ],
  capabilityHighlights: ["Leads a team of 13 senior systems engineers."],
  agencies: ["U.S. Space Force", "DoD"],
  meta: {
    filename: "resume.pdf",
    parsedAt: "2026-07-15T00:00:00.000Z",
    model: "claude-opus-4-8",
    aiStatus: "ok",
    aiMessage: null,
    pageCount: 2,
    resumeStored: false,
  },
};

/** Mirrors what the component holds after the member reviews without edits. */
function selectionFrom(p: ResumeProposal): ReviewSelection {
  return {
    headline: p.headline ?? "",
    summary: p.summary ?? "",
    laborCategory: p.laborCategory ?? "",
    yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : "",
    clearanceLevel: p.clearance.level,
    skills: p.skills,
    certifications: p.certifications,
    education: p.education,
    experience: p.experience,
    resumeSourceFilename: p.meta.filename,
    resumeParseModel: p.meta.model,
  };
}

const parse = (p: ResumeProposal) =>
  applyResumeProposalSchema.safeParse(
    JSON.parse(JSON.stringify(buildProposalPayload(selectionFrom(p)))),
  );

test("a realistic AI extraction survives the round trip to the schema", () => {
  const result = parse(PROPOSAL);
  if (!result.success) {
    assert.fail(
      "the UI's real payload must validate:\n" +
        result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"),
    );
  }
});

test("null means 'the resume didn't say' — not a validation error", () => {
  const r = parse(PROPOSAL);
  assert.ok(r.success);
  const cissp = r.data.certifications.find((c) => c.name === "CISSP");
  assert.equal(cissp?.issuer, null, "an unknown issuer stays null");
  assert.equal(cissp?.identifier, null);
  const acme = r.data.experience.find((e) => e.organization === "Acme Systems");
  assert.equal(acme?.agency, null, "a commercial role has no agency, and that's fine");
  assert.equal(acme?.contractName, null);
});

test("unknown years of experience stays null and is never coerced to 0", () => {
  // A silent 0 would put "0 years of RMF experience" on a capability statement
  // as an asserted fact. Unknown and zero are different claims.
  const r = parse(PROPOSAL);
  assert.ok(r.success);
  const rmf = r.data.skills.find((s) => s.name === "RMF");
  assert.equal(rmf?.yearsExperience, null, "unknown must not become 0");
  const splunk = r.data.skills.find((s) => s.name === "Splunk");
  assert.equal(splunk?.yearsExperience, 5, "a stated value still comes through");
});

test("a current role's 'Present' becomes a null end date", () => {
  const r = parse(PROPOSAL);
  assert.ok(r.success);
  const current = r.data.experience.find((e) => e.organization === "MacTech");
  assert.equal(current?.endedOn, null);
  assert.equal(current?.startedOn?.toISOString().slice(0, 10), "2019-03-01");
});

test("scalars, provenance, and clearance carry through", () => {
  const r = parse(PROPOSAL);
  assert.ok(r.success);
  assert.equal(r.data.headline, "Senior Cybersecurity Engineer");
  assert.equal(r.data.yearsExperience, 12);
  assert.equal(r.data.clearanceLevel, "ts_sci");
  assert.equal(r.data.resumeSourceFilename, "resume.pdf");
  assert.equal(r.data.resumeParseModel, "claude-opus-4-8");
});

test("a heuristics-only proposal (AI unavailable) also validates", () => {
  // The degraded path posts a proposal with null scalars and empty collections.
  const degraded: ResumeProposal = {
    ...PROPOSAL,
    headline: null,
    summary: null,
    laborCategory: null,
    skills: [],
    education: [],
    experience: [],
    capabilityHighlights: [],
    meta: { ...PROPOSAL.meta, model: null, aiStatus: "failed", aiMessage: "unavailable" },
  };
  const r = parse(degraded);
  assert.ok(r.success, "the AI-unavailable path must still be savable");
  assert.equal(r.data.headline, null);
  assert.equal(r.data.resumeParseModel, null, "no model ran, so no model is recorded");
});

test("the member unchecking every row still produces a valid payload", () => {
  const r = parse({
    ...PROPOSAL,
    skills: [],
    certifications: [],
    education: [],
    experience: [],
  });
  assert.ok(r.success, "rejecting everything is a legitimate choice");
  assert.deepEqual(r.data.skills, []);
});

test("a member clearing every scalar produces nulls, not errors", () => {
  const cleared = { ...PROPOSAL, headline: null, summary: null, laborCategory: null, yearsExperience: null };
  const r = parse(cleared);
  assert.ok(r.success);
  assert.equal(r.data.headline, null);
  assert.equal(r.data.yearsExperience, null);
});
