# SBIR/STTR Finance handoff

BizOps owns topic discovery, fit assessment, opportunity context, and pre-award capability data. It does not own actual labor, charge codes, payroll, or effort-compliance calculations.

`GET /api/sbir/:id/finance-handoff` emits a tenant-scoped, hash-identified packet for Finance. The packet includes program, phase, award dates/value, source references, and explicit blockers. It deliberately does not guess a principal investigator or regulatory effort percentage. Those values must be confirmed from the executed award, solicitation, agency deviations, and current applicable requirements before Finance activates its `SBIRAwardControl`.

The endpoint is read-only. It creates no award, accounting, time, or compliance record and cannot mark an award compliant. Finance monitors actual effort using approved time; Governance retains only readiness evidence references.
