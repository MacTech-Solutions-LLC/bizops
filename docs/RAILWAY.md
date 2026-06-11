# Railway — BizOps

Set variables via `railway variables set` (never commit values).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (MacTech Suite — Dev) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `HUB_AUTHORITY_MODE` | `mock` (default) or `live` |
| `MACTECH_HUB_URL` | Hub base URL |
| `MACTECH_HUB_SERVICE_TOKEN` | Live Hub service token (when authorized) |
| `MACTECH_APP_KEY` | `bizops` |
| `NODE_ENV` | `production` |

Build uses `scripts/railway-build.sh` to clone and build `@mactech/hub-client`.
