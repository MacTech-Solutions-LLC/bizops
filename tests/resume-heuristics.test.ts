import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectAgencies,
  detectCertifications,
  detectClearance,
  detectYearsExperience,
  runHeuristics,
  splitSections,
} from "@/lib/resume/heuristics";
import { extractResumeText, MAX_RESUME_BYTES } from "@/lib/resume/extract-text";
import { mergeCertificationsForTest, parseResume } from "@/lib/resume";
import { ValidationError } from "@/lib/errors";

const SAMPLE = `JANE Q. SAMPLE
Fairfax, VA | jane.sample@example.com

PROFESSIONAL SUMMARY
Systems engineer with 12+ years of experience delivering cloud infrastructure
for Department of Defense customers. Active TS/SCI clearance with CI polygraph.

EXPERIENCE

Senior Cloud Architect
Booz Allen Hamilton, McLean VA | 2019 - Present
Led migration of 40+ legacy applications to AWS GovCloud for the U.S. Navy
under the NAVSEA Enterprise Cloud contract.

CERTIFICATIONS
CISSP (ISC2), #123456, issued 2018
PMP, Project Management Institute, 2019

TECHNICAL SKILLS
AWS, Kubernetes, Terraform, Python
`;

const utf8 = (s: string) => new TextEncoder().encode(s);

// --- clearance -------------------------------------------------------------

test("detectClearance finds TS/SCI and returns the source line as evidence", () => {
  const result = detectClearance(SAMPLE);
  assert.equal(result.level, "ts_sci");
  assert.match(result.evidence ?? "", /TS\/SCI/);
});

test("detectClearance prefers the most specific level", () => {
  // "Secret" appears inside "Top Secret" — must not under-classify.
  assert.equal(detectClearance("Active Top Secret clearance").level, "top_secret");
  assert.equal(detectClearance("Active Secret clearance").level, "secret");
});

test("detectClearance ignores 'secret' used as ordinary prose", () => {
  const result = detectClearance("The secret to good architecture is simplicity.");
  assert.equal(result.level, "none");
});

test("detectClearance returns none rather than guessing when absent", () => {
  assert.equal(detectClearance("Software engineer. Python, Go.").level, "none");
});

test("detectClearance windows the evidence when the resume has no line breaks", () => {
  // PDF extraction routinely yields the whole resume as one bullet-joined line.
  // Evidence is for the member to eyeball, so it must stay snippet-sized.
  const oneLine = `${"Led a team of engineers • ".repeat(40)}Active DoD TS/SSBI • ${"Delivered ATO packages • ".repeat(40)}`;
  const result = detectClearance(oneLine);
  assert.equal(result.level, "top_secret");
  assert.match(result.evidence ?? "", /TS\/SSBI/);
  assert.ok(
    (result.evidence?.length ?? 0) < 200,
    `evidence should be a snippet, got ${result.evidence?.length} chars`,
  );
});

// --- certifications --------------------------------------------------------

test("detectCertifications matches known federal certifications", () => {
  const certs = detectCertifications(SAMPLE);
  assert.ok(certs.includes("CISSP"));
  assert.ok(certs.includes("PMP"));
});

test("detectCertifications does not invent certifications", () => {
  assert.deepEqual(detectCertifications("I am a good engineer."), []);
});

// --- agencies --------------------------------------------------------------

test("detectAgencies finds agencies named directly and via component commands", () => {
  const agencies = detectAgencies(SAMPLE);
  assert.ok(agencies.includes("U.S. Navy"), "NAVSEA should resolve to U.S. Navy");
  assert.ok(agencies.includes("DoD"), "Department of Defense should resolve to DoD");
});

// --- years -----------------------------------------------------------------

test("detectYearsExperience prefers an explicit claim over date arithmetic", () => {
  assert.equal(detectYearsExperience(SAMPLE), 12);
});

test("detectYearsExperience falls back to the span of years present", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(detectYearsExperience("Worked 2016 - 2020 at Acme.", now), 10);
});

test("detectYearsExperience returns null when there is no signal", () => {
  assert.equal(detectYearsExperience("Engineer at Acme."), null);
});

// --- sections --------------------------------------------------------------

test("splitSections finds canonical sections and drops the contact block", () => {
  const sections = splitSections(SAMPLE);
  assert.ok(sections.summary, "summary section should be found");
  assert.ok(sections.experience, "experience section should be found");
  assert.match(sections.experience, /Booz Allen/);
  // The contact line precedes the first heading, so it must not survive.
  const joined = Object.values(sections).join("\n");
  assert.doesNotMatch(joined, /jane\.sample@example\.com/);
});

// --- extraction guards -----------------------------------------------------

test("extractResumeText rejects an unsupported content type", async () => {
  await assert.rejects(
    () => extractResumeText(utf8(SAMPLE), "image/png", "resume.png"),
    ValidationError,
  );
});

test("extractResumeText rejects an empty file", async () => {
  await assert.rejects(
    () => extractResumeText(new Uint8Array(0), "text/plain", "empty.txt"),
    ValidationError,
  );
});

test("extractResumeText rejects a file over the size limit", async () => {
  const oversized = new Uint8Array(MAX_RESUME_BYTES + 1);
  await assert.rejects(
    () => extractResumeText(oversized, "text/plain", "big.txt"),
    ValidationError,
  );
});

test("extractResumeText rejects text too short to be a resume (scanned PDF case)", async () => {
  await assert.rejects(() => extractResumeText(utf8("hi"), "text/plain", "x.txt"), ValidationError);
});

// --- pipeline --------------------------------------------------------------

test("parseResume with useAI:false yields the heuristic floor and stores nothing", async () => {
  const proposal = await parseResume(utf8(SAMPLE), "text/plain", "sample.txt", { useAI: false });

  assert.equal(proposal.clearance.level, "ts_sci");
  assert.equal(proposal.yearsExperience, 12);
  assert.ok(proposal.certifications.some((c) => c.name === "CISSP"));
  assert.equal(proposal.meta.aiStatus, "skipped");
  assert.equal(proposal.meta.resumeStored, false);
  // Heuristic-sourced rows must be labelled so the review UI can mark them
  // unconfirmed rather than presenting them as member-asserted fact.
  assert.ok(proposal.certifications.every((c) => c.source === "heuristic"));
});

test("runHeuristics is pure — same input, same output", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.deepEqual(runHeuristics(SAMPLE, now), runHeuristics(SAMPLE, now));
});

// --- heuristic/AI certification merge ---------------------------------------
//
// Regression: a live extraction produced BOTH "AWS Certified Solutions
// Architect" (heuristic, base name) and "AWS Certified Solutions Architect -
// Professional" (AI, graded name) for one credential on the resume, so the
// member saw it listed twice.

test("a graded AI cert name merges with its heuristic base name", async () => {
  const resume = `CERTIFICATIONS
AWS Certified Solutions Architect - Professional, 2020
CISSP (ISC2), issued 2018
This resume needs enough body text to clear the minimum-length guard, so here
is a professional summary describing cloud engineering work for federal customers.
`;
  const p = await parseResume(utf8(resume), "text/plain", "certs.txt", { useAI: false });
  const aws = p.certifications.filter((c) => /solutions architect/i.test(c.name));
  assert.equal(aws.length, 1, "the base cert should appear exactly once pre-merge");
});

test("merge keeps the more specific grade and re-labels it as AI-derived", () => {
  const merged = mergeCertificationsForTest(
    ["AWS Certified Solutions Architect", "CISSP"],
    [
      {
        name: "AWS Certified Solutions Architect - Professional",
        issuer: "Amazon",
        identifier: null,
        issuedOn: "2020",
        expiresOn: null,
      },
      { name: "CISSP", issuer: "ISC2", identifier: "#123456", issuedOn: "2018", expiresOn: null },
    ],
  );

  assert.equal(merged.length, 2, "must not duplicate a graded cert");

  const aws = merged.find((c) => /solutions architect/i.test(c.name));
  assert.ok(aws);
  assert.equal(aws.name, "AWS Certified Solutions Architect - Professional", "keep the grade");
  assert.equal(aws.source, "ai", "the grade was model-derived, so don't badge it as matched");
  assert.equal(aws.issuer, "Amazon", "merge should pull in AI-only detail");

  const cissp = merged.find((c) => c.name === "CISSP");
  assert.ok(cissp);
  assert.equal(cissp.source, "heuristic", "an exact-name match stays heuristic");
  assert.equal(cissp.identifier, "#123456", "and still gains AI detail");
});

test("merge does not collapse genuinely different certifications", () => {
  const merged = mergeCertificationsForTest(
    ["CISSP"],
    [{ name: "CISM", issuer: null, identifier: null, issuedOn: null, expiresOn: null }],
  );
  assert.equal(merged.length, 2, "CISSP and CISM are different credentials");
});

test("merge keeps an AI-only certification the heuristics never saw", () => {
  const merged = mergeCertificationsForTest(
    [],
    [{ name: "Certified Kubernetes Administrator", issuer: "CNCF", identifier: null, issuedOn: null, expiresOn: null }],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, "ai");
});
