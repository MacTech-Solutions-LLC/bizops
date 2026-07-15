# Resume Parsing & Member Capability Profiles

BizOps lets a member self-serve their GovCon capability profile by uploading a resume. The resume is parsed in memory to pre-fill fields the member then confirms. **The resume file is never stored.**

## Authority boundary

| Data | Owner | Where it lives |
| --- | --- | --- |
| Legal name, email, avatar, org membership, role, auth | **Hub** | Resolved per-request into `GovConContext`. No local column. |
| Labor category, clearance, skills, certifications, education, federal past performance | **BizOps** | `GovConMemberProfile` + children, keyed by opaque `hubUserId`. |

This split is what keeps the feature compliant with `AGENTS.md` (DR-2026-06-10-01, *"No local identity SoT"*). Hub's `UserProfile` is thin — it has no concept of a clearance or an LCAT — and those are exactly what a Capability Statement is built from. Hub's own `SuiteObjectReference` contract states that *"local apps may keep rich domain data"*, which is the basis for owning capability data here.

**If you are adding a field to `GovConMemberProfile`, ask: is this who the person *is* (Hub), or what they can be *proposed for* (BizOps)?** An `email` column here would be a regression, not a convenience.

## The "not stored" guarantee

This is a promise made explicitly in the UI, so it constrains the code:

- `lib/resume/extract-text.ts` takes bytes → returns a string. It deliberately does **not** import `lib/storage`. If a change needs a `StorageAdapter` in that module, the privacy boundary is being crossed — challenge it in review.
- `app/(app)/onboarding/actions.ts#parseResumeAction` reads the upload into memory, parses, and returns a structured *proposal*. Nothing is persisted.
- `lib/services/member-profile.ts#applyResumeProposal` is the only path that writes parsed data, and it runs on the member-confirmed payload — not the raw extraction.
- `GovConMemberProfile.resumeSourceFilename` / `resumeParsedAt` / `resumeParseModel` are **provenance metadata about a parse that happened**, not a pointer to a file. There is intentionally no `storageReference` on the model, and `tests/member-profile.test.ts` asserts that.

The resume's *contents* are never logged and never written to the audit trail — only the filename, the model id, and counts.

## Pipeline

```
bytes ──▶ extract-text ──▶ heuristics ──▶ AI enrichment ──▶ proposal ──▶ [member reviews] ──▶ DB
          (in memory)      (deterministic)  (claude-opus-4-8)              ▲
                                 │                  │                      │
                                 └── always runs ───┴── may fail ──────────┘
                                     (the floor)        (degrades)
```

### Why two layers

The heuristic layer (`lib/resume/heuristics.ts`) is not a fallback bolted on — it owns things a regex is genuinely better at:

1. **Closed vocabularies.** Clearance levels, named certifications, and federal agencies either appear in the text or they don't. That's a match, not a judgement, and a match cannot hallucinate.
2. **Availability.** If the Anthropic API is down or unconfigured, onboarding still works. `parseResume` returns `meta.aiStatus: "failed"` with the deterministic floor intact rather than throwing.

The AI layer handles what needs *understanding*: role summaries, skill grouping, whether an employer was a federal customer.

### What the model is deliberately not asked for

- **Clearance level.** Set only by exact match in `detectClearance`. A model inferring "probably Secret" from context would put an unverifiable clearance claim on a federal bid. The prompt tells the model to ignore clearance entirely.
- **Name, email, phone, address.** Identity is Hub-owned. We don't want it, so we don't ask for it, and it never enters the extraction payload.

### Confirm-before-persist

Every extracted row carries a `GovConFieldSource` (`heuristic` | `ai` | `manual`). The review UI badges anything non-`manual` so an AI guess is never presented as fact the member asserted. Rows the member unchecks are absent from the submitted payload, and `applyResumeProposal` replaces collections wholesale — so rejecting a bad extraction actually sticks.

## Configuration

| Variable | Required | Effect |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | For AI enrichment | Unset → heuristics-only, `aiStatus: "failed"`, member sees a message and can type the rest. |

Set it via `railway variables set ANTHROPIC_API_KEY=...` — never commit it (`AGENTS.md`).

Model is pinned in `lib/resume/ai.ts` (`RESUME_PARSE_MODEL`). Extraction quality is validated against that pin; bump it alongside a re-check of the review-step output.

### Verifying the AI path

`npm test` never calls the API — the live test is gated on `RESUME_AI_LIVE=1`, so the default suite and CI stay free and deterministic. To exercise the real model:

```bash
railway run npm run test:ai-live
```

`railway run` injects `ANTHROPIC_API_KEY` from the Railway environment into the subprocess, so the key never has to be copied into a local `.env`. Run this after changing the prompt, the extraction schema, or the pinned model.

The live test asserts *shape and discipline*, not phrasing — a model isn't deterministic, and pinning its wording would just create noise. What it does enforce: the real facts get extracted, federal vs commercial is distinguished correctly, and the two hard exclusions hold (no contact details, no clearance). It earns its keep: it caught a duplicate-certification bug that no unit test would have — the heuristic matched the base name `AWS Certified Solutions Architect` while the model returned the graded `… - Professional`, and the exact-name dedupe showed the member both. See `isSameCertification` in `lib/resume/index.ts`.

### Privacy note

With AI enrichment on, **resume text is sent to the Anthropic API**. This is disclosed in the onboarding UI. Given this codebase's CMMC/CUI awareness (`cmmcTargetLevel`, `cuiBoundaryType`, DD254 handling) and that resumes routinely state clearances, confirm this is acceptable for your data-handling posture before enabling it in an environment that processes CUI. To run without it, leave `ANTHROPIC_API_KEY` unset — the heuristic floor keeps onboarding functional.

## Supported formats

PDF (`unpdf`), Word `.docx` (`mammoth`), plain text, Markdown. Max 5MB. Scanned/image-only PDFs are rejected with a message pointing the member at a text-based export — there is no OCR.

## Permissions

| Permission | Grants |
| --- | --- |
| `org:govcon:profile:self` | Edit **your own** profile. Held by every role including `guest` — onboarding must not need an elevated grant. |
| `org:govcon:profile:manage` | Read/edit **other members'** profiles; enumerate the org. Manager+. |

`requireProfileAccess` in the service applies this on every path taking a `hubUserId`, so a member cannot read a colleague's clearance by guessing an id.

## Not yet built

- **Capability Statements** (personal and the live org-wide rollup). The schema supports them: `capabilityHighlights` are extracted today, `listPublishedProfiles` is the aggregation entry point, and `status: published` gates which profiles may reach a customer-facing document. Deliberately deferred to a second pass so the generators are built against extraction output validated on real resumes.
- Manual add/edit of individual skills, certs, and experience rows after the initial resume import.
