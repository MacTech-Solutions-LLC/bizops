import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStatementPayload,
  serialiseStatementPayload,
  type StatementSelection,
} from "@/lib/capability-statement/payload";
import { saveCapabilityStatementSchema } from "@/lib/validation/capability-statement";
import { seedDraft, type ProfileForStatement } from "@/lib/capability-statement/assemble";

/**
 * THE SEAM TEST.
 *
 * The review UI serialises a StatementSelection; the server parses it with
 * saveCapabilityStatementSchema. This pins the two sides together against the
 * shapes the UI actually produces — an AI/seed-shaped draft with nulls and
 * blank rows the member left behind — so the seam can't drift the way the resume
 * one did twice.
 */

/** A draft as the AI or the seed produces it: a null summary, blank rows the
 * member didn't fill, and a duplicate the member forgot to remove. */
const SELECTION: StatementSelection = {
  professionalSummary: "  Leads RMF authorization for DoD space systems.  ",
  coreCompetencies: ["RMF / ATO", "  ", "Splunk engineering", "RMF / ATO"],
  differentiators: ["Active TS/SCI", "CISSP (ISC2)"],
  pastPerformanceHighlights: ["ISSM · U.S. Space Force: ran the ATO for a ground system", ""],
  generateModel: "claude-opus-4-8",
  syncedFromSuite: true,
};

test("UI payload parses against the save schema", () => {
  const raw = serialiseStatementPayload(SELECTION);
  const parsed = saveCapabilityStatementSchema.safeParse(JSON.parse(raw));
  assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
});

test("blank rows are dropped, prose is trimmed", () => {
  const parsed = saveCapabilityStatementSchema.parse(buildStatementPayload(SELECTION));
  assert.equal(parsed.professionalSummary, "Leads RMF authorization for DoD space systems.");
  // "  " dropped; the two real rows kept (dedup is the UI's job, not the schema's,
  // but the blank MUST be gone or it renders as an empty bullet).
  assert.deepEqual(parsed.coreCompetencies, ["RMF / ATO", "Splunk engineering", "RMF / ATO"]);
  assert.deepEqual(parsed.pastPerformanceHighlights, [
    "ISSM · U.S. Space Force: ran the ATO for a ground system",
  ]);
});

test("an empty statement is a legal save (member cleared everything)", () => {
  const parsed = saveCapabilityStatementSchema.parse({
    professionalSummary: "",
    coreCompetencies: [],
    differentiators: [],
    pastPerformanceHighlights: [],
    generateModel: null,
  });
  assert.equal(parsed.professionalSummary, null);
  assert.deepEqual(parsed.coreCompetencies, []);
  assert.equal(parsed.generateModel, null);
});

test("a hand-built profile seeds a draft the schema accepts", () => {
  // The AI-unavailable path: seedDraft feeds the same review UI, so its output
  // must round-trip through the same seam.
  const profile: ProfileForStatement = {
    headline: "Systems Engineer",
    summary: "Ten years supporting Navy C5ISR programs.",
    laborCategory: "Systems Engineer III",
    yearsExperience: 10,
    clearanceLevel: "secret",
    naicsCodes: ["541512"],
    skills: [
      { name: "Systems engineering", category: null },
      { name: "DoDAF", category: "Architecture" },
    ],
    certifications: [{ name: "PMP", issuer: "PMI" }],
    experience: [
      {
        organization: "Acme Federal",
        role: "Lead Engineer",
        startedOn: new Date(Date.UTC(2018, 0, 1)),
        endedOn: null,
        summary: "Led integration for a shipboard sensor suite.",
        isFederal: true,
        agency: "U.S. Navy",
        contractName: "SEA-2020",
      },
    ],
  };

  const draft = seedDraft(profile);
  const selection: StatementSelection = {
    professionalSummary: draft.professionalSummary ?? "",
    coreCompetencies: draft.coreCompetencies,
    differentiators: draft.differentiators,
    pastPerformanceHighlights: draft.pastPerformanceHighlights,
    generateModel: null,
    syncedFromSuite: false,
  };

  const parsed = saveCapabilityStatementSchema.safeParse(
    JSON.parse(serialiseStatementPayload(selection)),
  );
  assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
  assert.deepEqual(parsed.data?.coreCompetencies, ["Systems engineering", "DoDAF"]);
  assert.deepEqual(parsed.data?.differentiators, ["PMP (PMI)"]);
});
