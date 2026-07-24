import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { computeCoverage, mergeRoster, type LocalMemberSignals } from "@/lib/domain/team";
import type { HubRosterMember } from "@/lib/hub/roster";

/**
 * Pure roster-merge + coverage tests. The merge is the seam between the Hub's
 * identity authority and bizops' capability rows, and its union shape is the
 * point: a Hub member with no local row is exactly who the alerts must catch.
 */

function hubMember(overrides: Partial<HubRosterMember> = {}): HubRosterMember {
  return {
    hubUserId: "user_1",
    email: "jane@mactech.example",
    firstName: "Jane",
    lastName: "Doe",
    imageUrl: null,
    role: "read_only_user",
    membershipStatus: "active",
    userStatus: "active",
    ...overrides,
  };
}

function localSignals(overrides: Partial<LocalMemberSignals> = {}): LocalMemberSignals {
  return {
    hubUserId: "user_1",
    profileStatus: "published",
    completeness: 80,
    headline: "Systems Engineer",
    laborCategory: "SE III",
    resumeParsedAt: new Date("2026-01-01"),
    statementConfirmedAt: new Date("2026-02-01"),
    profileUpdatedAt: new Date("2026-02-02"),
    ...overrides,
  };
}

describe("mergeRoster", () => {
  test("hub member with no local profile appears with every alert raised", () => {
    const entries = mergeRoster([hubMember({ hubUserId: "user_new" })], [], []);
    assert.equal(entries.length, 1);
    const e = entries[0];
    assert.equal(e.displayName, "Jane Doe");
    assert.equal(e.profileStatus, null);
    assert.equal(e.hasResume, false);
    assert.equal(e.hasStatement, false);
    assert.equal(e.isPublished, false);
    assert.equal(e.isContributing, false);
  });

  test("local profile with no hub row still shows (degraded identity)", () => {
    const entries = mergeRoster(null, [localSignals()], []);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].displayName, null);
    assert.equal(entries[0].isContributing, true);
  });

  test("directory INTERNAL contact fills the name when the hub roster is absent", () => {
    const entries = mergeRoster(
      null,
      [localSignals()],
      [{ hubUserId: "user_1", name: "Jane From Directory", email: "jane@dir.example" }],
    );
    assert.equal(entries[0].displayName, "Jane From Directory");
    assert.equal(entries[0].email, "jane@dir.example");
  });

  test("hub identity wins over the directory fallback", () => {
    const entries = mergeRoster(
      [hubMember()],
      [localSignals()],
      [{ hubUserId: "user_1", name: "Stale Directory Name", email: null }],
    );
    assert.equal(entries[0].displayName, "Jane Doe");
  });

  test("hub and local rows merge by hubUserId without duplication", () => {
    const entries = mergeRoster([hubMember()], [localSignals()], []);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].displayName, "Jane Doe");
    assert.equal(entries[0].completeness, 80);
  });

  test("suspended and inactive hub members are dropped", () => {
    const entries = mergeRoster(
      [
        hubMember({ hubUserId: "user_ok" }),
        hubMember({ hubUserId: "user_susp", userStatus: "suspended" }),
        hubMember({ hubUserId: "user_gone", membershipStatus: "inactive" }),
      ],
      [],
      [],
    );
    assert.deepEqual(
      entries.map((e) => e.hubUserId),
      ["user_ok"],
    );
  });

  test("contributing requires BOTH published and a confirmed statement", () => {
    const published = mergeRoster(
      null,
      [localSignals({ statementConfirmedAt: null })],
      [],
    )[0];
    assert.equal(published.isContributing, false);

    const draft = mergeRoster(
      null,
      [localSignals({ profileStatus: "draft" })],
      [],
    )[0];
    assert.equal(draft.isContributing, false);
  });

  test("named members sort before opaque ids", () => {
    const entries = mergeRoster(
      [hubMember({ hubUserId: "user_named" })],
      [localSignals({ hubUserId: "zz_opaque" })],
      [],
    );
    assert.deepEqual(
      entries.map((e) => e.hubUserId),
      ["user_named", "zz_opaque"],
    );
  });
});

describe("computeCoverage", () => {
  test("rolls up the alert lists the pages render", () => {
    const entries = mergeRoster(
      [hubMember({ hubUserId: "user_full" }), hubMember({ hubUserId: "user_empty" })],
      [
        localSignals({ hubUserId: "user_full" }),
        localSignals({
          hubUserId: "user_norstatement",
          statementConfirmedAt: null,
          profileStatus: "draft",
        }),
      ],
      [],
    );
    const coverage = computeCoverage(entries);
    assert.equal(coverage.total, 3);
    assert.equal(coverage.contributing, 1);
    assert.deepEqual(
      coverage.missingResume.map((e) => e.hubUserId).sort(),
      ["user_empty"],
    );
    assert.deepEqual(
      coverage.missingStatement.map((e) => e.hubUserId).sort(),
      ["user_empty", "user_norstatement"],
    );
    assert.deepEqual(
      coverage.notPublished.map((e) => e.hubUserId).sort(),
      ["user_empty", "user_norstatement"],
    );
  });
});
