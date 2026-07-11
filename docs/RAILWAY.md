# Railway — MacTech GovCon Ops (`bizops`)

Set variables via `railway variables set` — never commit values. `.env` is
gitignored; `.env.example` documents names only.

## Build & start

- **Build:** `scripts/railway-build.sh` → provisions `@mactech/hub-client`
  (`prepare-hub-client.sh`) → `npm install` → `prisma generate` → `next build`.
  Installing GitHub-Packages deps (`@mactech-solutions-llc/design-tokens`) requires
  `NODE_AUTH_TOKEN` with `read:packages` during install.
- **Start:** `npm start` → `prisma migrate deploy && next start` (non-interactive;
  no destructive auto-seed). Migrations are applied on boot; the demo seed
  (`npm run db:seed`) is **manual only** and refuses to run in production unless
  `SEED_ALLOW_PROD=1`.
- **Health:** `GET /api/health` → `{ status, appKey, hubMode, database, version }`
  (503 when the DB is unreachable). **Build info:** `GET /api/build-info` (Railway
  git/service env). Both are public (listed in `middleware.ts`).
- No local sibling-directory requirement in production (hub-client is vendored at
  build time). No secret is required during source checkout.

## Environment variables

Legend — **Req**: required to boot · **Opt**: optional · **Public**: inlined into
the browser bundle (`NEXT_PUBLIC_*`, non-secret) · **Server**: server-only ·
**Secret**: sensitive · **Dev/Prod**: environment scope.

| Variable | Req/Opt | Exposure | Env | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | **Req** | Server / Secret | Both | PostgreSQL connection string (Prisma). Provisioned per Railway environment. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Req** | Public | Both | Clerk publishable key (build-time inlined). |
| `CLERK_SECRET_KEY` | **Req** | Server / Secret | Both | Clerk secret key. Never prefix `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_URL` | **Req** | Public | Both | Canonical app URL (`https://bizops.mactechsolutionsllc.com` in prod; `http://localhost:3000` in dev). |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Opt | Public | Both | Sign-in route path (`/sign-in`). |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Opt | Public | Both | Sign-up route path (`/sign-up`). |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Opt | Public | Both | Post sign-in redirect (`/`). |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Opt | Public | Both | Post sign-up redirect (`/`). |
| `HUB_AUTHORITY_MODE` | Opt | Server | Both | `mock` (default) or `live`. Live requires the Hub service token. |
| `MACTECH_HUB_URL` | Opt | Server | Both | Hub base URL (default `https://www.suite.mactechsolutionsllc.com`). |
| `MACTECH_HUB_SERVICE_TOKEN` | Req in `live` | Server / Secret | Prod | Hub ApiKey scoped `app_authority_resolve` + `audit_ingest`, tagged `bizops`. |
| `MACTECH_APP_KEY` | Opt | Server | Both | Must be `bizops`. |
| `NODE_AUTH_TOKEN` | **Req at build** | Server / Secret | Both (CI/build) | GitHub Packages token (`read:packages`) for `@mactech-solutions-llc/design-tokens`. Build-time only. |
| `NODE_ENV` | Opt | Server | Both | `production` in Railway. |
| `SEED_ALLOW_PROD` | Opt | Server | Prod | Guard override for the demo seed; leave unset in production. |
| `RAILWAY_GIT_*`, `RAILWAY_SERVICE_ID`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_NAME` | Auto | Server | Prod | Injected by Railway; surfaced by `/api/build-info`. |

## Cutover to live Hub

`HUB_AUTHORITY_MODE` stays `mock` until the platform live-Hub checklist is complete
(see `docs/LIVE_HUB_PILOT.md`). To go live: set `HUB_AUTHORITY_MODE=live`, provide
`MACTECH_HUB_SERVICE_TOKEN`, confirm the `bizops` AppRegistry row is `active` with a
`ProductEntitlement` for the pilot org, and redeploy. Rollback = set mode back to
`mock` and redeploy.

## Custom domain

Canonical host is `https://bizops.mactechsolutionsllc.com` (configurable via
`NEXT_PUBLIC_APP_URL`). Railway may also provide a generated service domain. See
`docs/CLERK_CUSTOM_DOMAIN.md` for the Clerk allowlist/redirect checklist.
