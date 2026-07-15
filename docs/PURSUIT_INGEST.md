# Pursuit ingest — real active bids

How a real pursuit gets from its folder on disk into the Active Bids page.
This is **not** the demo seed (`prisma/seed.ts`), which writes fictional `[DEMO]`
rows to the mock tenant and must never carry real bid data.

## Rule 1: bid data never enters this repository

**This repo is public.** A pursuit record carries live pricing, the rate card, and
MacTech's negotiating position on procurements that have not been awarded.
Publishing that is not recoverable — it belongs in MacTech's Postgres and nowhere
else.

So the records live **outside the tree**, as JSON under `PURSUIT_DATA_DIR`
(default `~/Contracting/.bizops-pursuits/`), and the ingest reads them at runtime:

```
~/Contracting/.bizops-pursuits/       ← records (never committed)
  <pursuit-key>.json
bizops/scripts/pursuits/
  schema.ts                           ← shape only, no data
  load.ts                             ← reads + validates PURSUIT_DATA_DIR
```

`.gitignore` carries `scripts/pursuits/*.json` as a backstop, but the real
protection is that the records are not in the tree at all. **Do not paste bid
figures into source files, tests, or docs** — including this one.

## Rule 2: artifacts are references, never binaries

`GovConDocument.storageReference` holds a **path**; `storageProvider` is
`local_workstation`. No file content is read, hashed, uploaded, or served.

- The pursuit folders carry **CUI-marked material**. MacTech's stated posture is
  that commercial tenants are not authorized destinations for CUI on these
  engagements. Railway is a commercial PaaS.
- The schema already said so: `storageReference` is commented *"key / path / url —
  never the binary itself."*
- The artifact register therefore shows a **copyable path**, not a download link.
  Adding a download means answering the accreditation question first.

## Running it

```bash
# Production — the real Hub tenant. MACTECH_ORG_ID has no default, by design.
MACTECH_ORG_ID=org_xxxxx npx tsx scripts/ingest-pursuits.ts

# See the plan, validate every record, write nothing
MACTECH_ORG_ID=org_xxxxx npx tsx scripts/ingest-pursuits.ts --dry-run
```

| Variable | Required | Purpose |
|---|---|---|
| `MACTECH_ORG_ID` | **Yes** | Real Hub tenant. No default — defaulting risks writing real bids into the demo org. |
| `PURSUIT_DATA_DIR` | No | Where the JSON records live. Defaults to `~/Contracting/.bizops-pursuits`. |
| `PURSUIT_ROOT` | No | Root the artifact paths resolve against. Defaults to `~/Contracting`. |
| `MACTECH_ACTOR_ID` | No | Recorded as `createdBy`/`updatedBy`. Defaults to `ingest:pursuits`. |
| `INGEST_ALLOW_DEMO_ORG` | No | Escape hatch to target `org_acme` for **local verification only**. |

The script is **idempotent**: every row id derives from the pursuit key
(`pursuit-<key>`, `pursuit-<key>-risk-<key>`, …), so re-running after editing a
record updates in place and never duplicates.

### Local verification

Local dev runs `HUB_AUTHORITY_MODE=mock`, so every signed-in user resolves to the
fixture tenant `org_acme` — the same org the demo seed writes to. Ingesting there
is the only way to see real pursuits locally, so it is allowed but never silently:

```bash
MACTECH_ORG_ID=org_acme INGEST_ALLOW_DEMO_ORG=1 npx tsx scripts/ingest-pursuits.ts
```

Production runs `HUB_AUTHORITY_MODE=live` and resolves real Hub orgs, so the guard
never fires there. Note the local `.env` ships a **placeholder Clerk key**, so
authenticated pages cannot render locally without real Clerk dev credentials.

## Authoring a record

Drop a `<pursuit-key>.json` into `PURSUIT_DATA_DIR` matching `pursuitSchema`
(`scripts/pursuits/schema.ts`), then dry-run. Validation is strict and failures
are loud — a bad record never lands half-ingested.

- **Every value is transcribed from a source document** — the sub-bid letter, the
  pricing workbook, the manifest. If a fact has no source, it does not belong.
- **Never invent a number.** Fields the documents don't state are `null`. `pWin` is
  the live example: it is stated nowhere in either current pursuit, so both carry
  `pWin: null` — which is why the Active Bids page does not lead with it.
- **Dates are calendar dates** (`YYYY-MM-DD`), anchored at **12:00 UTC** by the
  ingest. Midnight UTC formats as the *previous day* for any viewer west of
  Greenwich — an off-by-one on a bid deadline.
- **Keep MacTech's scope separate from project magnitude.** A cyber sub-bid on a
  large construction project is worth a tiny fraction of it. Only the sub-bid is a
  pipeline value; the magnitude goes in `projectMagnitudeNote` as prose.
- **Record what the source gets wrong.** `dataQualityNotes` captures known gaps —
  a missing amendment, a README asserting a stale stage. Don't launder them into
  clean-looking data.

## Value semantics

The Active Bids page reads three money fields with specific meanings:

| Field | Meaning |
|---|---|
| `estimatedValue` | **Basis of bid** — the option MacTech actually carries. |
| `minValue` | Lowest electable option, when the bid offers tiers. |
| `maxValue` | Basis + every live adder/alternate — the top of MacTech's exposure. |

`contingentExposure()` derives `max − estimated`: the priced-but-unelected
headroom the bid can still grow by **without a re-bid**. The schema enforces
`min ≤ estimated ≤ max`.
