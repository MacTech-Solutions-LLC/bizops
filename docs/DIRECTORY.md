# Directory — company address book

The Directory is the canonical MacTech contact store: people
(`DirectoryContact`) and organizations (`DirectoryOrganization`), internal and
external, tenant-scoped by `hubOrganizationId`. It is deliberately separate
from the capture-focused `GovConContact` (acquisition roles, influence,
interaction log): the Directory holds app-neutral address-book facts that any
suite app can create and pull.

## Data model

`prisma/schema.prisma`, section "Directory". Closed vocabularies are Prisma
enums (never free text):

- `DirectoryOrgType` — INTERNAL, GOVERNMENT, PRIME, SUBCONTRACTOR,
  TEAMING_PARTNER, VENDOR, CONSULTANT, OTHER
- `DirectoryContactKind` — INTERNAL, EXTERNAL
- `DirectoryEntryStatus` — ACTIVE, ARCHIVED (archive instead of delete)

Contacts optionally link to a `DirectoryOrganization` in the same tenant
(enforced by the service layer), or carry a free-text `organizationName`.
`sourceApp` records which suite app created the row; `hubUserId` links an
INTERNAL contact to the suite member. Org names are unique per tenant.

## In-app UI

`/directory` (nav: Relationships → Directory): searchable people table
(kind/organization filters) + organization cards, with detail and create/edit
pages. Reads gate on `org:govcon:view`; writes on `org:govcon:directory:manage`
(granted to contributor and up). All mutations flow through
`lib/services/directory.ts` → `recordAudit` (`directory.*` actions).

## Cross-app API (machine-to-machine)

Sibling suite apps use `/api/directory/*` with the dedicated
`MACTECH_DIRECTORY_SERVICE_TOKEN` (one token per capability, mirroring the
profile_read pattern in ADR-0003). Verification is `lib/service-auth.ts`:
constant-time compare, plus a mandatory `x-mactech-service-app` header naming
the caller. Calls run under a synthetic `service:<app>` actor holding only
`org:govcon:view` + `org:govcon:directory:manage`, so the shared validation,
tenant isolation, and audit trail apply to every writer. The routes are on the
Clerk middleware public allowlist; with the env var unset they return 503.

Headers on every request:

```
authorization: Bearer $MACTECH_DIRECTORY_SERVICE_TOKEN
x-mactech-service-app: <caller app key, e.g. "fieldops">
```

`organizationId` is always the **Hub tenant org id** — query param on GET,
body field on POST/PATCH. To link a contact to a `DirectoryOrganization`
record, send the link as `directoryOrganizationId` (query filter on GET, body
field on POST/PATCH) — never as `organizationId`, which is reserved for the
tenant on this surface.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/directory/contacts?organizationId=…&q=&kind=&status=&tag=&directoryOrganizationId=` | List/search people |
| POST | `/api/directory/contacts` | Create a person (`{ organizationId, name, directoryOrganizationId?, ... }`) |
| GET | `/api/directory/contacts/:id?organizationId=…` | Fetch one person |
| PATCH | `/api/directory/contacts/:id` | Update (`{ organizationId, ...fields }`; `""` clears a field) |
| GET | `/api/directory/organizations?organizationId=…&q=&orgType=&status=` | List/search organizations |
| POST | `/api/directory/organizations` | Create an organization |

Example — pull all external contracting contacts:

```bash
curl -s "https://bizops.mactechsolutionsllc.com/api/directory/contacts?organizationId=$ORG&kind=EXTERNAL" \
  -H "authorization: Bearer $MACTECH_DIRECTORY_SERVICE_TOKEN" \
  -H "x-mactech-service-app: fieldops"
```

Example — create a contact from another app:

```bash
curl -s -X POST "https://bizops.mactechsolutionsllc.com/api/directory/contacts" \
  -H "authorization: Bearer $MACTECH_DIRECTORY_SERVICE_TOKEN" \
  -H "x-mactech-service-app: fieldops" \
  -H "content-type: application/json" \
  -d '{"organizationId":"'$ORG'","name":"Jane Doe","kind":"EXTERNAL","email":"jane@agency.gov","tags":"contracting, ko"}'
```

### Token scope and rotation

The token is suite-internal and tenant-unscoped: any holder can read/write any
tenant's directory, but nothing else (no opportunities, financials, or
profiles). Rotate it independently of `MACTECH_HUB_SERVICE_TOKEN`. If a
consumer app should ever be limited to specific tenants, add a per-app token →
allowed-org map in `lib/service-auth.ts`.
