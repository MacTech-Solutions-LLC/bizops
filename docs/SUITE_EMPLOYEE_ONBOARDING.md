# Suite Employee Onboarding

BizOps is the manager-facing initiation surface for employee onboarding. Hub remains the authority for identity, organization membership, app access, and cross-app object references.

## Flow

1. Owner or manager opens `Team` in BizOps.
2. BizOps submits `POST /api/v1/onboarding/employees` to Hub with the active Hub organization id.
3. Hub creates or updates the canonical `UserProfile`, `OrgUserAccess`, audit event, and `hub.user_profile` suite object reference.
4. BizOps creates a local onboarding task with checklist items for Hub invitation, app access, Training assignments, QMS forms, and Governance signing review.
5. Downstream apps discover the employee by Hub user id and keep their own domain records authoritative.

## Authority Boundaries

- Hub owns user identity, roles, entitlements, and object references.
- Training owns training requirements, assignments, completions, reminders, and evidence.
- QMS owns controlled documents, forms, approvals, quality records, and signer references.
- Governance owns delegation/signature authority and contract/compliance retention.
- Portal displays profile, status, task notifications, and cross-app links without becoming a second system of record.
