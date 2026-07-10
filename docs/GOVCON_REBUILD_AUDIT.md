# GovCon Ops Rebuild — Implementation Audit

> Repository-grounded inventory produced at the start of the rebuild of **MacTech BizOps** into
> **MacTech GovCon Ops**. Reconstruction branch: `rebuild/govcon-ops-v1`, based on the last stable
> integration commit `f3c5d1952d6bee0413addcf11d9fc6b24d2ec0a8` (tenant-bound Clerk + Hub
> organization-context workflow). The prior `main` head (`cbb2aa2`, merge-corrupted) is preserved
> under tag `archive/pre-govcon-rebuild-2026-07-10`.

## 1. Why reconstruction is necessary

`main` HEAD (`cbb2aa2`, "Phase B — MacTech design system scaffold #10") introduced merge corruption
that prevents a clean build:

- **`package.json` + `package-lock.json`** — duplicate `@mactech/hub-client` dependency key with two
  different `file:` targets (last-wins JSON parsing hides a real conflict).
- **`app/layout.tsx`** — the whole file duplicated: two `import` blocks, two `export const metadata`,
  two `export default function RootLayout` → duplicate default export (compile error).
- **`components/ui/bizops-nav-shell.tsx`** — duplicate `const AUTH_FREE_PREFIXES`, duplicate `footer`
  prop, `Link` used but never imported, `<Link>…</a>` tag mismatch.
- **`components/ui/sidebar-nav.tsx`** — same unimported-`Link` / `<Link>…</a>` mismatch.

The **parent commit `f3c5d19` is clean**: `tsc --noEmit` and `next build` both pass, the dependency
key is singular (`file:./vendor/hub-client`), and `app/layout.tsx` has a single default export. That
is why the rebuild branches from `f3c5d19`, not from `main`.

Beyond the corruption, the pre-rebuild app is a **thin read-only CRM stub** (3 flat models, no writes,
no validation, no audit, no tests). It is not a foundation a production GovCon capture/proposal system
can be built on without a substantial domain, authorization, audit, and UI buildout.

## 2. Useful code being preserved

| Area | Files | Disposition |
| --- | --- | --- |
| Clerk middleware | `middleware.ts` | **Keep**, extend public-route matcher for new health/build-info/webhook routes. |
| Auth/tenant context | `lib/auth/context.ts` (`requireAppAuthContext`, `getAppAuthContext`) | **Keep + extend** — the tenant key `ctx.hub.tenant.organizationId` becomes the org scope for every GovCon query. |
| Org-context policy/UX | `lib/auth/org-context-policy.ts`, `org-context-server.ts`, `components/auth/suite-*.tsx` | **Keep** — tenant binding, operator vs tenant_bound modes, org switcher. |
| Hub client integration | `lib/hub/client.ts`, `lib/hub/smoke.ts`, `scripts/prepare-hub-client.sh`, `run-prepare-hub-client.mjs`, `hub-entry-ready.mjs` | **Keep** — `@mactech/hub-client` vendoring + `resolveAppAccess`. Add `emitHubAuditEvent` wrapper. |
| Prisma init | `lib/db/prisma.ts` | **Keep** — standard singleton. |
| Company identity model | `CompanyProfile` (CAGE/UEI/NAICS) | **Keep** — genuinely fits GovCon org identity. |
| Railway build | `scripts/railway-build.sh`, `railway.json`, `nixpacks.toml` | **Keep**, ensure `prisma generate` + `migrate deploy` are non-interactive on startup. |
| Health/smoke | `app/api/health/route.ts`, `scripts/smoke*.mjs` | **Keep + extend** health to the suite shape; keep smoke scripts. |
| Design tokens | `tailwind.config.ts` (`mactechPreset`), `app/globals.css` | **Keep** the token pipeline; re-mood to `quiet`/slate + navy sidebar. |

## 3. Broken or obsolete code being replaced

| Area | Files | Disposition |
| --- | --- | --- |
| Core pipeline model | `Campaign` (Prisma) | **Retire** as the pipeline model → replaced by `GovConOpportunity`. Table retained (non-destructive) pending a follow-on drop migration. |
| Team model | `TeamMember` | **Fold** into lightweight membership/assignment concept referenced by GovCon records. |
| Read-only domain w/ swallowed errors | `lib/domain/bizops.ts` (`catch → []/null`) | **Replace** with `lib/services/*` + `lib/errors.ts` (structured errors, no silent empties). |
| In-memory stub domain | `lib/domain/store.ts` | **Remove** — a second competing domain layer serving fabricated data to `/api/summary`. |
| Stub CRM pages | `app/company`, `app/team`, `app/campaigns` | **Replace** with the GovCon route groups (dashboard, opportunities, …). |
| Dead Clerk controls | `components/auth/clerk-org-account-controls.tsx`, `clerk-org-bootstrap.tsx` | **Remove** — superseded by `suite-*` variants. |
| Missing lint config | (none) | **Add** `.eslintrc.json` so `next lint` is non-interactive. |
| Missing endpoints | (none) | **Add** `/api/build-info`; extend `/api/health`. |

## 4. Architecture

### Authentication
Clerk owns identity/sessions/MFA/orgs/memberships/invitations. `clerkMiddleware` protects all routes
except an explicit public allowlist. Server components/actions resolve the signed-in user via Clerk
`auth()` inside `requireAppAuthContext()`.

### Tenant
The MacTech **Hub** is the tenancy authority. `resolveAppAccess({ appKey: "bizops", clerkUserId,
clerkOrgId })` returns a `HubAccessSnapshot` whose `tenant.organizationId` is the canonical tenant key.
Every GovCon row carries `hubOrganizationId`; every query filters on it; there are no cross-tenant
reads. `mock` mode is used locally/CI, `live` mode in production.

### Authorization
Business permissions follow the suite convention (`lib/permissions.ts`, colon-triple strings). GovCon
permissions map to the `org:govcon:*` namespace and are exposed as `GOVCON_*` constants
(`lib/permissions/govcon.ts`). A single server-side gate `requireGovConPermission(ctx, permission)`
wraps every service call; UI hiding is cosmetic only, never the security boundary. Permissions are
derived from the Hub snapshot (`snapshot.resolvedPermissions` / member roles) with a defensible local
role→permission fallback in mock mode.

### Audit
The Hub is the canonical suite-wide audit authority (`POST /api/hub/audit/events`, append-only). A
local wrapper `lib/audit.ts` emits `emitHubAuditEvent({ eventType, eventCategory, action,
actorHubUserId, organizationId, objectType, objectId, beforeJson, afterJson, metadata })` for every
material mutation (opportunity/stage/owner/PWin/financial/bid/partner/proposal/requirement/review/
submission/outcome/readiness/document/export/admin changes). There is no audit delete control. Audit
emission failures are logged as compliance events and never block the user path beyond a safe error.

### Railway
Build: `scripts/railway-build.sh` (prepare hub-client → `npm install` → `prisma generate` →
`next build`). Start: `prisma migrate deploy && next start` (non-interactive). Health + build-info
endpoints are public and Railway-env populated. No sibling-directory requirement in production (the
hub-client is vendored at build time). No secret required during source checkout. No destructive
auto-seed.

### Shared-package
`@mactech/hub-client` (vendored) provides Hub authority + audit. `@mactech-solutions-llc/design-tokens`
(GitHub Packages) provides the Tailwind preset + CSS-var moods. `@mactech-solutions-llc/onboard` is not
required. The bizops app remains a **separate repo**; the suite repo owns AppRegistry/entitlements.

## 5. Existing deployment assumptions

- Canonical host `https://bizops.mactechsolutionsllc.com`; Railway also provides a generated domain.
- `HUB_AUTHORITY_MODE` stays `mock` until the platform live-Hub checklist is complete.
- GitHub Packages auth (`NODE_AUTH_TOKEN`, `read:packages`) is required at install for design-tokens.
- Postgres is provisioned per-environment (`DATABASE_URL`). Local dev uses a native Postgres (this
  machine: `postgresql://patrick@localhost:5432/bizops_dev`).

## 6. Identified risks

1. **Cross-tenant leakage** if any query omits the `hubOrganizationId` filter → mitigated by a
   mandatory service-layer scope + tenant-isolation tests.
2. **Privilege escalation** if a mutation skips `requireGovConPermission` → mitigated by routing all
   writes through services that call the gate + permission tests.
3. **Silent DB failure** (legacy `catch → []`) masking outages as "no data" → mitigated by structured
   errors and safe error states.
4. **Audit gaps** if a mutation forgets to emit → mitigated by emitting inside the service transaction
   and asserting audit rows in tests.
5. **Hub/Clerk desync** (stale snapshot) → mitigated by failing closed on privileged routes and mock
   fallback in non-prod.
6. **Design-token/registry availability** at build → mitigated by vendoring hub-client and documenting
   the `NODE_AUTH_TOKEN` requirement in `docs/RAILWAY.md`.
7. **Schema scale** (large activity/opportunity volumes) → mitigated by indexes, server-side
   pagination, and aggregate queries.

## 7. Migration approach

- **Additive, non-destructive.** The rebuild adds `GovCon*` tables via a new Prisma migration. The
  legacy `Campaign`, `CompanyProfile`, `TeamMember` tables are **not dropped** in this branch.
- `CompanyProfile` is retained and reused for org identity (CAGE/UEI/NAICS) surfaced under Readiness /
  Settings.
- `Campaign` and `TeamMember` are superseded; any real data would be reviewed and mapped
  (`Campaign` → seed-only demo, no production rows expected) before a **follow-on drop migration** in a
  later PR. No production data is destroyed by this PR.
- Seed data is **idempotent** (upsert by stable keys) and **clearly marked fictional** so it cannot be
  mistaken for MacTech's real pipeline.

## 8. Vertical-slice implementation sequence

0. **Stabilization** — clean build gate (lint config, structured errors, build-info, health shape,
   dep hygiene, test harness).
1. **Domain foundation** — Prisma `GovCon*` schema + migration, permissions, authz gate, audit
   wrapper, tenant-safe services, Zod schemas, idempotent seed.
2. **Dashboard & Opportunities** — app shell, data-backed dashboard, opportunity CRUD + detail tabs,
   pipeline, global search.
3. **Tasks, milestones, comments, activity, notifications, calendar.**
4. **Capture plan & bid/no-bid decision** (weighted, reviewer approval, audit).
5. **Proposal room** — volumes, compliance matrix, color reviews, workflow board.
6. **SBIR/STTR** — topics, weighted assessment, technical/commercialization/transition.
7. **Partners, contract vehicles, agencies/contacts, readiness** + expiration alerts.
8. **Reports & hardening** — report suite, exports, a11y/mobile/perf/security, E2E tests, docs, deploy
   verification.

Each slice runs the gate (`typecheck → lint → test → build`, plus `smoke` where relevant) and is
committed independently. Suite-side changes (AppRegistry activation + `govcon` entitlement/role) ship
as a **separate branch + draft PR** in `mactech-suite-platform`, cross-linked to the bizops PR.
