# Clerk custom domain — BizOps

Brian checklist for sign-in on the production custom hostname. **Docs only** — apply Clerk Dashboard and Railway changes manually.

| Item | Value |
|---|---|
| App key | `bizops` |
| Custom hostname | `https://bizops.mactechsolutionsllc.com` |
| Clerk instance | MacTech Suite — Dev (same pattern as [Opportunities](https://github.com/MacTech-Solutions-LLC/Opportunities) on `https://opportunity.mactechsolutionsllc.com`) |

## 1. Clerk Dashboard — allowlist origins and redirects

Open [Clerk Dashboard](https://dashboard.clerk.com) → select the BizOps application → **Configure**.

### Allowed origins / Authorized parties

Clerk UI labels vary (`Paths`, **Allowed origins**, or **Authorized parties**). Add the production origin:

- `https://bizops.mactechsolutionsllc.com`

Keep existing Railway dev origin if still in use (`https://bizops-production.up.railway.app`).

### Redirect URLs

Under **Paths** (or **Redirect URLs**), allow:

| URL | Purpose |
|---|---|
| `https://bizops.mactechsolutionsllc.com/sign-in` | Sign-in route (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`) |
| `https://bizops.mactechsolutionsllc.com/sign-up` | Sign-up route (`NEXT_PUBLIC_CLERK_SIGN_UP_URL`) |
| `https://bizops.mactechsolutionsllc.com/` | App home / post-auth fallback (`NEXT_PUBLIC_CLERK_*_FALLBACK_REDIRECT_URL` → `/`) |

Match the [Opportunities](https://github.com/MacTech-Solutions-LLC/Opportunities) `.env.example` path pattern; only the hostname changes for BizOps.

## 2. Railway — align `NEXT_PUBLIC_APP_URL`

In the BizOps Railway service, set (variable **name** only — value is the custom hostname):

```text
NEXT_PUBLIC_APP_URL=https://bizops.mactechsolutionsllc.com
```

Confirm it matches the Clerk allowlist origin exactly (https, no trailing slash). See [docs/RAILWAY.md](RAILWAY.md) for other Clerk variable names.

## 3. Do not enable satellite mode

Do **not** set `NEXT_PUBLIC_CLERK_IS_SATELLITE=true` unless Brian explicitly authorizes a multi-domain Clerk satellite setup. This app uses standard Clerk session on a single canonical URL.

## 4. Verification (after cutover)

- [ ] Sign in at `https://bizops.mactechsolutionsllc.com/sign-in` completes without redirect errors
- [ ] Post sign-in lands on `/`
- [ ] `GET /api/health` still returns OK on the custom hostname
- [ ] No `pk_` / `sk_` keys committed in repo (Railway vars only)

## Reference

- Opportunities production hostname: `https://opportunity.mactechsolutionsllc.com` (uses `APP_BASE_URL`; BizOps uses `NEXT_PUBLIC_APP_URL` per greenfield convention)
- Local env template: [`.env.example`](../.env.example)
