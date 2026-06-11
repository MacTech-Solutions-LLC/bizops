# Railway — BizOps

Set variables via `railway variables set` (never commit values).

Clerk sign-in URL variable names follow the [Opportunities](https://github.com/MacTech-Solutions-LLC/Opportunities) `.env.example` pattern.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (MacTech Suite — Dev) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route path (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route path (`/sign-up`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Post sign-in redirect (`/`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Post sign-up redirect (`/`) |
| `HUB_AUTHORITY_MODE` | `mock` (default) or `live` |
| `MACTECH_HUB_URL` | Hub base URL |
| `MACTECH_HUB_SERVICE_TOKEN` | Live Hub service token (when authorized) |
| `MACTECH_APP_KEY` | `bizops` |
| `NODE_ENV` | `production` |

Build uses `scripts/railway-build.sh` to clone and build `@mactech/hub-client`.
