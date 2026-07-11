import assert from "node:assert/strict";
import { test } from "node:test";
import {
  missingResponseAlerts,
  requirementCoverage,
  unassignedAlerts,
  type RequirementLike,
} from "@/lib/services/proposal-metrics";

const reqs: RequirementLike[] = [
  { refId: "L.1", status: "UNASSIGNED", ownerId: null, volumeId: null, responseSection: null, mandatory: true },
  { refId: "L.2", status: "ASSIGNED", ownerId: "u1", volumeId: "v1", responseSection: "3.1", mandatory: true },
  { refId: "L.3", status: "DRAFTED", ownerId: "u2", volumeId: "v1", responseSection: "3.2", mandatory: true },
  { refId: "M.1", status: "IN_REVIEW", ownerId: "u1", volumeId: "v2", responseSection: "4.1", mandatory: false },
  { refId: "M.2", status: "COMPLETE", ownerId: "u3", volumeId: "v2", responseSection: "4.2", mandatory: true },
  { refId: "M.3", status: "ASSIGNED", ownerId: "u3", volumeId: "v2", responseSection: null, mandatory: true },
];

test("requirementCoverage buckets mixed statuses and computes percent", () => {
  const c = requirementCoverage(reqs);
  assert.equal(c.total, 6);
  assert.equal(c.unassigned, 1);
  // ASSIGNED (2) + DRAFTED (1) = 3
  assert.equal(c.assigned, 3);
  assert.equal(c.inReview, 1);
  assert.equal(c.complete, 1);
  // covered = 6 - 1 unassigned = 5 → round(5/6*100) = 83
  assert.equal(c.coveragePercent, 83);
});

test("requirementCoverage handles the empty set without dividing by zero", () => {
  const c = requirementCoverage([]);
  assert.deepEqual(c, {
    total: 0,
    unassigned: 0,
    assigned: 0,
    inReview: 0,
    complete: 0,
    coveragePercent: 0,
  });
});

test("unassignedAlerts flags UNASSIGNED status or missing owner+volume", () => {
  const alerts = unassignedAlerts(reqs);
  // Only L.1 is UNASSIGNED and has neither owner nor volume.
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].refId, "L.1");

  const orphan: RequirementLike[] = [
    { refId: "X.1", status: "ASSIGNED", ownerId: null, volumeId: null },
  ];
  // Status is ASSIGNED but no owner and no volume → still an alert.
  assert.equal(unassignedAlerts(orphan).length, 1);
});

test("missingResponseAlerts flags mandatory requirements without a response section", () => {
  const alerts = missingResponseAlerts(reqs);
  // L.1 (mandatory, no response) and M.3 (mandatory, response null). M.1 is non-mandatory.
  const refs = alerts.map((r) => r.refId).sort();
  assert.deepEqual(refs, ["L.1", "M.3"]);
});
