# Smoke checks — BizOps

Anonymous endpoints for deploy health and mock Hub wiring. No secrets required when `HUB_AUTHORITY_MODE=mock` (default).

## Deploy URL

`https://bizops-production.up.railway.app`

## Health

```bash
curl -sS https://bizops-production.up.railway.app/api/health
```

Expected `200`:

```json
{ "status": "ok", "appKey": "bizops", "hubMode": "mock" }
```

## Mock Hub smoke

In-process check that `createHubAuthorityClient` + `resolveAppAccess` succeeds without `MACTECH_HUB_SERVICE_TOKEN`.

```bash
curl -sS https://bizops-production.up.railway.app/api/smoke/hub-mock
```

Expected `200` when `hubMode` is `mock`:

```json
{ "status": "ok", "hubMode": "mock", "appKey": "bizops", "allowed": true }
```

## Local

With `npm run dev` running:

```bash
npm run smoke
```

Or against a custom base URL:

```bash
BASE_URL=http://localhost:3000 npm run smoke
```
