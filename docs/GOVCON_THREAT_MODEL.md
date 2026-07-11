# GovCon Ops — Threat Model

Scope: the MacTech GovCon Ops application (`bizops`), a multi-tenant capture /
proposal / readiness workspace built on Next.js 14, Clerk (identity), the MacTech
Hub (tenancy + entitlements + audit authority), PostgreSQL/Prisma, and Railway.
This document enumerates the primary threats and the concrete controls in the
codebase that mitigate them. It complements `docs/GOVCON_REBUILD_AUDIT.md`.

## Trust model

- **Clerk** is the identity authority (users, sessions, MFA, orgs, memberships).
- **MacTech Hub** is the tenancy + entitlement + audit authority. `resolveAppAccess`
  returns the canonical tenant (`hubOrganizationId`), membership role, and resolved
  permissions. Business authorization reads from the Hub snapshot, never from
  caller-supplied identity.
- **This app** owns GovCon business records, scoped to `hubOrganizationId`. It
  trusts the Hub snapshot and Clerk session, and treats all request input as
  untrusted.

## Assets

Pursuit intelligence (win themes, black-hat, pricing hypotheses), financials,
partner/teaming data, contacts (incl. sensitivity notes), proposal content,
compliance/readiness records, and the audit trail.

## Threats & controls

### 1. Cross-tenant access (tenant isolation)
- **Threat:** a user in org A reads/writes org B's pursuits.
- **Controls:** every service query filters on `ctx.tenantOrgId` (the Hub-resolved
  org); `getOpportunity`/detail reads use `findFirst({ where: { id, hubOrganizationId }})`
  so an id from another tenant returns not-found. The tenant key comes from the Hub
  snapshot, never from a request parameter. Covered by tenant-isolation tests
  (`tests/opportunities.test.ts` and per-domain tests).

### 2. IDOR (insecure direct object reference)
- **Threat:** guessing/altering a record id to reach another tenant's row.
- **Controls:** ids are cuids; every read/mutate is scoped by `hubOrganizationId`;
  cross-tenant ids resolve to `NotFoundError` (404), which does not leak existence.

### 3. Privilege escalation
- **Threat:** a viewer performs a manager-only action (bid approval, financial edit,
  export, archive).
- **Controls:** a single server-side gate `requireGovConPermission(ctx, perm)` wraps
  every mutation; permissions are resolved from the Hub snapshot (entitlement
  features + membership role). UI hiding is cosmetic only. Financial edits require
  `GOVCON_FINANCIAL_EDIT`; bid decisions require `GOVCON_BID_DECISION_APPROVE`;
  exports require `GOVCON_EXPORT`; archive requires `GOVCON_ARCHIVE`. Covered by
  permission-enforcement tests (`tests/authz.test.ts`, service tests).

### 4. Unauthorized export / data exfiltration
- **Threat:** bulk export of the pipeline by an unauthorized user.
- **Controls:** the CSV export route resolves the GovCon context, requires
  `GOVCON_EXPORT`, filters by tenant, caps the result set, and records an audit event
  (`opportunities.exported`, category `security`) with the actor, count, and filters.

### 5. Search leakage
- **Threat:** global search returns another tenant's records.
- **Controls:** `search()` requires `GOVCON_VIEW` and scopes every sub-query to
  `ctx.tenantOrgId`; the `/api/search` route returns 401 without a context.

### 6. Notification leakage
- **Threat:** a user sees notifications addressed to someone else.
- **Controls:** notification queries filter on both `hubOrganizationId` and
  `recipientId = ctx.actorHubUserId`; mark-read only affects the actor's rows.

### 7. Audit tampering
- **Threat:** altering/deleting the audit trail to hide activity.
- **Controls:** there is no audit delete/update path in the app. Local
  `GovConActivityEvent` rows are append-only in practice (no update/delete service),
  and material events are forwarded to the Hub's append-only central audit
  (enforced by a Postgres trigger on the Hub side). Audit writes happen inside the
  same transaction as the mutation they record.

### 8. Clerk / Hub synchronization failure
- **Threat:** a stale or failed authority resolution grants or denies access wrongly.
- **Controls:** privileged reads resolve a fresh Hub snapshot each request; the Hub
  client fails closed on stale/expired privileged snapshots. In `mock` mode a
  documented role→permission fallback drives access for local/dev only. Operational
  failures surface as `OperationalError` (503), never as silent empty data.

### 9. Malicious document metadata
- **Threat:** injection via document names / storage references / CSV cells.
- **Controls:** documents store **metadata only** (no binaries in Postgres) behind a
  `StorageAdapter` interface; all input is Zod-validated; CSV cells are escaped and
  formula-injection-neutralised (`lib/export/csv.ts`); output is rendered as text by
  React (no `dangerouslySetInnerHTML`).

### 10. Compromised integration credentials
- **Threat:** leak of the Hub service token or DB URL.
- **Controls:** no secrets are committed (`.env` gitignored; `.env.example` documents
  names only); `CLERK_SECRET_KEY` and `MACTECH_HUB_SERVICE_TOKEN` are server-only;
  the Hub token is scoped to `app_authority_resolve` + `audit_ingest` for `bizops`;
  rotation is an operational runbook item. `NEXT_PUBLIC_*` vars are treated as public.

## Additional controls

- **Input validation:** Zod schemas on every mutation; structured `ValidationError`
  (422) with field issues; no raw Prisma/driver errors reach the client (all mapped
  through `AppError.toResponseBody()`).
- **Safe redirects:** navigation uses fixed internal routes; no open-redirect from
  user input.
- **Optimistic concurrency:** `version` fields prevent lost updates / TOCTOU on core
  records.
- **Least privilege in UI:** actions are hidden when the permission is absent *and*
  enforced server-side (defense in depth).

## Residual risks / follow-ons

- Rate limiting on search/export endpoints is recommended at the edge (Railway/CDN)
  for the initial release.
- Field-level encryption for the most sensitive narrative fields (black-hat, pricing)
  is a future enhancement.
- A periodic reconciliation job for failed Hub audit forwards (logged as compliance
  events) should be added when live Hub audit is enabled.
