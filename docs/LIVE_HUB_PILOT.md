# Live Hub Authority Pilot — BizOps

**Phase 3g · custom domain · mock → live**

This repo is the **first** satellite for live Hub authority. Full cutover steps live in the platform repo — agents document; Brian executes Railway and Hub admin steps.

**Authoritative runbook:** [mactech-suite-platform `docs/LIVE_HUB_PILOT_BIZOPS.md`](https://github.com/MacTech-Solutions-LLC/mactech-suite-platform/blob/main/docs/LIVE_HUB_PILOT_BIZOPS.md)

**Safety:** No tokens in git. `HUB_AUTHORITY_MODE` remains **`mock`** until Brian completes the platform checklist.

---

## Smoke URLs (custom domain — 3g-01 PASS)

`/api/health` and `/api/smoke/hub-mock` are public routes in `middleware.ts` so smoke curls work without a Clerk session.

Base: `https://bizops.mactechsolutionsllc.com`

### Health

```bash
curl -sS https://bizops.mactechsolutionsllc.com/api/health
```

Pre-cutover expected `200`:

```json
{ "status": "ok", "appKey": "bizops", "hubMode": "mock" }
```

Post-cutover expected `200`:

```json
{ "status": "ok", "appKey": "bizops", "hubMode": "live" }
```

### Mock Hub smoke (mock mode only)

```bash
curl -sS https://bizops.mactechsolutionsllc.com/api/smoke/hub-mock
```

Expected `200` while `hubMode` is `mock`:

```json
{ "status": "ok", "hubMode": "mock", "appKey": "bizops", "allowed": true }
```

When `hubMode` is `live`, this route returns `skipped` — use authenticated protected routes for `resolveAppAccess` verification (see platform runbook §3.2).

### Sign-in shell

```bash
curl -sS -o /dev/null -w "HTTP:%{http_code}\n" https://bizops.mactechsolutionsllc.com/sign-in
```

Expected `200`.

### Railway fallback

If custom domain is unavailable:

```bash
curl -sS https://bizops-production-4d93.up.railway.app/api/health
curl -sS https://bizops-production-4d93.up.railway.app/api/smoke/hub-mock
```

---

## Related docs

| Doc | Purpose |
| --- | --- |
| `docs/SMOKE.md` | General smoke commands (Railway default URL) |
| `docs/RAILWAY.md` | Hub env var names for BizOps Railway project |
| `docs/CLERK_CUSTOM_DOMAIN.md` | Clerk + DNS for `bizops.mactechsolutionsllc.com` |

---

## Live verification (after cutover)

1. `/api/health` shows `"hubMode": "live"`.
2. Pilot user signs in at `/sign-in` and reaches `/` with Hub-authorized org id.
3. Non-entitled user is redirected to `/access-denied`.

Rollback: set `HUB_AUTHORITY_MODE=mock` and redeploy — see platform runbook **Rollback** section.
