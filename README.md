# MacTech BizOps

Greenfield BizOps satellite ? company profile, team roster, and campaign stubs.

## Auth

- Clerk session only
- Hub `resolveAppAccess` via `@mactech/hub-client` (`appKey: bizops`)
- Default: `HUB_AUTHORITY_MODE=mock`

## Local dev

```bash
npm install   # requires sibling mactech-suite-platform/packages/hub-client
HUB_AUTHORITY_MODE=mock npm run dev
```

Clerk keys in local `.env` only (not committed).

## Railway

See [docs/RAILWAY.md](docs/RAILWAY.md).
