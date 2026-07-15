import assert from "node:assert/strict";
import { test } from "node:test";
import {
  scoreCompleteness,
  type CompletenessInput,
} from "@/lib/domain/profile-completeness";

function input(overrides: Partial<CompletenessInput> = {}): CompletenessInput {
  return {
    headline: null,
    summary: null,
    laborCategory: null,
    yearsExperience: null,
    clearanceLevel: "none",
    skillCount: 0,
    certificationCount: 0,
    educationCount: 0,
    experienceCount: 0,
    federalExperienceCount: 0,
    ...overrides,
  };
}

test("an empty profile still earns the clearance factor for answering", () => {
  // "none" is a complete answer. Scoring it down would push people toward
  // overstating a clearance, which is the opposite of what we want.
  const result = scoreCompleteness(input());
  assert.equal(result.score, 15);
});

test("a fully populated profile scores 100", () => {
  const result = scoreCompleteness(
    input({
      headline: "Senior Cloud Architect",
      summary: "Does cloud things.",
      laborCategory: "Systems Engineer III",
      yearsExperience: 12,
      clearanceLevel: "ts_sci",
      skillCount: 8,
      certificationCount: 2,
      educationCount: 2,
      experienceCount: 3,
      federalExperienceCount: 2,
    }),
  );
  assert.equal(result.score, 100);
  assert.deepEqual(result.nextSteps, []);
});

test("score never exceeds 100 even when every count is over target", () => {
  const result = scoreCompleteness(
    input({
      headline: "x",
      summary: "x",
      laborCategory: "x",
      yearsExperience: 40,
      clearanceLevel: "ts_sci",
      skillCount: 500,
      certificationCount: 50,
      educationCount: 10,
      experienceCount: 40,
      federalExperienceCount: 40,
    }),
  );
  assert.equal(result.score, 100);
});

test("federal experience is worth more than commercial experience", () => {
  const commercial = scoreCompleteness(input({ experienceCount: 3, federalExperienceCount: 0 }));
  const federal = scoreCompleteness(input({ experienceCount: 3, federalExperienceCount: 2 }));
  assert.ok(
    federal.score > commercial.score,
    "federal past performance should outscore commercial",
  );
});

test("skills award partial credit as they accumulate", () => {
  const none = scoreCompleteness(input({ skillCount: 0 })).score;
  const some = scoreCompleteness(input({ skillCount: 4 })).score;
  const full = scoreCompleteness(input({ skillCount: 8 })).score;
  assert.ok(none < some && some < full, "partial progress should be visible");
  // Past the target, more skills add nothing.
  assert.equal(scoreCompleteness(input({ skillCount: 40 })).score, full);
});

test("nextSteps surfaces unearned factors and is capped at three", () => {
  const result = scoreCompleteness(input());
  assert.ok(result.nextSteps.length > 0);
  assert.ok(result.nextSteps.length <= 3);
  assert.ok(
    result.nextSteps.every((s) => s.earned < s.weight),
    "an earned factor must not be suggested as a next step",
  );
  assert.ok(
    result.nextSteps.every((s) => s.hint.length > 0),
    "every next step needs an actionable hint",
  );
});

test("nextSteps drops a factor once it is satisfied", () => {
  const before = scoreCompleteness(input());
  assert.ok(before.nextSteps.some((s) => s.key === "summary"));
  const after = scoreCompleteness(input({ summary: "Does cloud things." }));
  assert.ok(!after.nextSteps.some((s) => s.key === "summary"));
});

test("factor weights total 100 so the score reads as a percentage", () => {
  const total = scoreCompleteness(input()).factors.reduce((sum, f) => sum + f.weight, 0);
  assert.equal(total, 100);
});

test("scoreCompleteness is pure — same input, same output", () => {
  assert.deepEqual(scoreCompleteness(input({ skillCount: 3 })), scoreCompleteness(input({ skillCount: 3 })));
});
