/**
 * Real-pursuit ingest — loads MacTech's actual active bids into the pipeline.
 *
 * Deliberately NOT `prisma/seed.ts`. That script writes fictional demo rows to
 * the mock tenant with `isDemo: true` and a "[DEMO]" name marker. This one writes
 * real business data: `isDemo: false`, no marker, and the tenant comes from
 * MACTECH_ORG_ID with no default — so it can never silently land in the demo org.
 *
 * NO BID DATA LIVES IN THIS REPO. The records are JSON under `PURSUIT_DATA_DIR`
 * (default `~/Contracting/.bizops-pursuits/`), loaded and schema-validated at
 * runtime. A pursuit record carries live pricing, rate cards, and negotiating
 * position on procurements that have not been awarded, and this repository is
 * public — that data belongs in MacTech's Postgres, never in a build artifact.
 *
 * Idempotent: every row has a deterministic id derived from the pursuit key, so
 * re-running updates in place and never duplicates. Safe to re-run after editing
 * a pursuit record.
 *
 * Artifacts are registered by REFERENCE ONLY. `storageReference` holds a path on
 * the operator's workstation and `storageProvider` is "local_workstation"; no file
 * content is ever read or uploaded. The pursuit folders carry CUI-marked material
 * and MacTech's own posture routes CUI through its secure portal, not a
 * commercial PaaS.
 *
 *   Usage:
 *     MACTECH_ORG_ID=org_xxx npx tsx scripts/ingest-pursuits.ts
 *     …add --dry-run to print the plan without writing.
 */

import { PrismaClient } from "@prisma/client";
import { loadPursuits, pursuitDataDir } from "./pursuits/load";
import type { PursuitData } from "./pursuits/schema";

const prisma = new PrismaClient();

const ORG = process.env.MACTECH_ORG_ID;
const ACTOR = process.env.MACTECH_ACTOR_ID ?? "ingest:pursuits";
/** Root the artifact references resolve against on the operator's workstation. */
const PURSUIT_ROOT = process.env.PURSUIT_ROOT ?? "~/Contracting";
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * ISO date string → Date, anchored at 12:00 UTC.
 *
 * These are calendar dates, not instants — "proposals due 30 Jul" is a day, and
 * it must read as the 30th everywhere. Anchoring at midnight UTC breaks that:
 * 2026-07-30T00:00Z formats as "Jul 29" for any viewer west of Greenwich, which
 * on a bid deadline is a genuinely dangerous off-by-one. Noon UTC keeps the
 * calendar day stable from UTC-12 through UTC+11.
 */
function date(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date in pursuit data: ${value}`);
  return d;
}

// Deterministic ids — stable across runs so upserts land on the same rows.
const oppId = (p: PursuitData) => `pursuit-${p.key}`;
const riskId = (p: PursuitData, key: string) => `pursuit-${p.key}-risk-${key}`;
const msId = (p: PursuitData, key: string) => `pursuit-${p.key}-ms-${key}`;
const taskId = (p: PursuitData, key: string) => `pursuit-${p.key}-task-${key}`;
const docId = (p: PursuitData, key: string) => `pursuit-${p.key}-doc-${key}`;
const contactId = (p: PursuitData, key: string) => `pursuit-${p.key}-contact-${key}`;

/** Agencies are shared across pursuits, so they key on name, not pursuit. */
async function upsertAgency(p: PursuitData): Promise<string> {
  const existing = await prisma.govConAgency.findUnique({
    where: { hubOrganizationId_name: { hubOrganizationId: ORG!, name: p.identity.agencyName } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.govConAgency.create({
    data: {
      hubOrganizationId: ORG!,
      name: p.identity.agencyName,
      abbreviation: p.identity.agencyAbbreviation,
      tier: "cabinet",
      isDemo: false,
      createdBy: ACTOR,
      updatedBy: ACTOR,
    },
    select: { id: true },
  });
  return created.id;
}

async function ingestPursuit(p: PursuitData): Promise<void> {
  const id = oppId(p);
  const agencyId = await upsertAgency(p);

  const opportunity = {
    hubOrganizationId: ORG!,
    internalName: p.identity.internalName,
    solicitationTitle: p.identity.solicitationTitle,
    solicitationNumber: p.identity.solicitationNumber,
    noticeId: p.identity.noticeId,
    type: p.identity.type,
    sourceSystem: p.identity.sourceSystem,
    agencyId,
    subAgency: p.identity.subAgency,
    command: p.identity.command,
    contractingOffice: p.identity.contractingOffice,
    placeOfPerformance: p.identity.placeOfPerformance,
    setAside: p.identity.setAside,
    naics: p.identity.naics,
    contractType: p.identity.contractType,
    competitionType: p.identity.competitionType,
    teamRole: p.identity.teamRole,

    estimatedValue: p.commercial.estimatedValue,
    minValue: p.commercial.minValue,
    maxValue: p.commercial.maxValue,
    periodOfPerformanceMonths: p.commercial.periodOfPerformanceMonths,

    postedDate: date(p.dates.postedDate),
    responseDeadline: date(p.dates.responseDeadline),
    questionsDeadline: date(p.dates.questionsDeadline),
    proposalDeadline: date(p.dates.proposalDeadline),
    expectedAwardDate: date(p.dates.expectedAwardDate),
    siteVisitDate: date(p.dates.siteVisitDate),

    stage: p.status.stage,
    health: p.status.health,
    priority: p.status.priority,
    pWin: p.status.pWin,
    nextAction: p.status.nextAction,
    nextActionDueAt: date(p.status.nextActionDueAt),
    lastActivityAt: date(p.status.lastActivityAt),

    bidDecisionSummary: p.narrative.bidDecisionSummary,
    winThemes: p.narrative.winThemes,
    discriminators: p.narrative.discriminators,
    customerPainPoints: p.narrative.customerPainPoints,
    solutionHypothesis: p.narrative.solutionHypothesis,
    pricingHypothesis: p.narrative.pricingHypothesis,
    keyPersonnelNeeds: p.narrative.keyPersonnelNeeds,
    clearanceNeeds: p.narrative.clearanceNeeds,
    complianceRequirements: p.narrative.complianceRequirements,

    isDemo: false,
    createdBy: ACTOR,
    updatedBy: ACTOR,
  };

  await prisma.govConOpportunity.upsert({
    where: { id },
    create: { id, ...opportunity },
    update: opportunity,
  });

  // Bid decision — the outcome a human recorded, carried verbatim from the letter.
  await prisma.govConBidDecision.upsert({
    where: { opportunityId: id },
    create: {
      id: `pursuit-${p.key}-bid`,
      hubOrganizationId: ORG!,
      opportunityId: id,
      outcome: p.status.bidOutcome,
      rationale: p.narrative.bidDecisionSummary,
      decidedAt: date(p.dates.proposalDeadline),
      decidedBy: ACTOR,
      createdBy: ACTOR,
      updatedBy: ACTOR,
    },
    update: {
      outcome: p.status.bidOutcome,
      rationale: p.narrative.bidDecisionSummary,
      updatedBy: ACTOR,
    },
  });

  for (const r of p.risks) {
    const data = {
      hubOrganizationId: ORG!,
      opportunityId: id,
      title: r.title,
      description: r.description,
      category: r.category,
      severity: r.severity,
      likelihood: r.likelihood,
      mitigation: r.mitigation,
      status: r.status,
      createdBy: ACTOR,
      updatedBy: ACTOR,
    };
    await prisma.govConRisk.upsert({
      where: { id: riskId(p, r.key) },
      create: { id: riskId(p, r.key), ...data },
      update: data,
    });
  }

  for (const m of p.milestones) {
    const data = {
      hubOrganizationId: ORG!,
      opportunityId: id,
      type: m.type,
      title: m.title,
      dueAt: date(m.dueAt),
      completedAt: m.status === "COMPLETED" ? date(m.dueAt) : null,
      status: m.status,
      notes: m.notes,
      isDemo: false,
      createdBy: ACTOR,
      updatedBy: ACTOR,
    };
    await prisma.govConMilestone.upsert({
      where: { id: msId(p, m.key) },
      create: { id: msId(p, m.key), ...data },
      update: data,
    });
  }

  // Open items become tasks. `blockedOn` is prepended to the description because
  // assigneeId expects an opaque Hub user id, and these parties are external.
  for (const o of p.openItems) {
    const data = {
      hubOrganizationId: ORG!,
      opportunityId: id,
      title: o.title,
      description: `Blocked on: ${o.blockedOn}\n\n${o.description}`,
      priority: o.priority,
      status: o.status,
      dueAt: date(o.dueAt),
      tags: ["pursuit-open-item", `blocked-on:${o.blockedOn}`],
      isDemo: false,
      createdBy: ACTOR,
      updatedBy: ACTOR,
    };
    await prisma.govConTask.upsert({
      where: { id: taskId(p, o.key) },
      create: { id: taskId(p, o.key), ...data },
      update: data,
    });
  }

  for (const c of p.contacts) {
    const data = {
      hubOrganizationId: ORG!,
      name: c.name,
      title: c.title,
      organizationName: c.organization,
      email: c.email ?? null,
      phone: c.phone ?? null,
      agencyId: c.side === "government" ? agencyId : null,
      contactType: c.side === "government" ? "government" : c.side === "mactech" ? "internal" : "teaming",
      isDemo: false,
      createdBy: ACTOR,
      updatedBy: ACTOR,
    };
    await prisma.govConContact.upsert({
      where: { id: contactId(p, c.key) },
      create: { id: contactId(p, c.key), ...data },
      update: data,
    });
  }

  // Artifacts — reference only. No file is opened, read, hashed, or uploaded.
  for (const a of p.artifacts) {
    const data = {
      hubOrganizationId: ORG!,
      opportunityId: id,
      name: a.name,
      category: a.category,
      status: a.status,
      version: a.version ?? null,
      storageProvider: "local_workstation",
      storageReference: `${PURSUIT_ROOT}/${p.folder}/${a.path}`,
      sensitivityMarking: a.sensitivityMarking,
      effectiveDate: date(a.effectiveDate),
      notes: a.notes,
      isDemo: false,
    };
    await prisma.govConDocument.upsert({
      where: { id: docId(p, a.key) },
      create: { id: docId(p, a.key), ...data },
      update: data,
    });
  }

  console.log(
    `  ${p.identity.internalName}\n` +
      `    stage=${p.status.stage} health=${p.status.health} value=$${p.commercial.estimatedValue.toLocaleString()}\n` +
      `    ${p.risks.length} risks · ${p.milestones.length} milestones · ${p.openItems.length} open items · ` +
      `${p.contacts.length} contacts · ${p.artifacts.length} artifacts (by reference)`,
  );
}

async function main() {
  if (!ORG) {
    throw new Error(
      "MACTECH_ORG_ID is required — it is the real tenant these pursuits belong to.\n" +
        "There is no default: defaulting risks writing real bid data into the demo org.",
    );
  }
  // `org_acme` is the mock Hub fixture tenant — what every signed-in user resolves
  // to in local dev. Ingesting there is the only way to see real pursuits in a
  // local browser, so it is allowed but never by accident.
  if (ORG === "org_acme" && process.env.INGEST_ALLOW_DEMO_ORG !== "1") {
    throw new Error(
      "MACTECH_ORG_ID is 'org_acme', the fictional demo tenant that local mock-mode\n" +
        "sign-ins resolve to. Real pursuit data should not land there by accident.\n" +
        "For local verification only, set INGEST_ALLOW_DEMO_ORG=1.",
    );
  }
  if (process.env.NODE_ENV === "production" && ORG === "org_acme") {
    throw new Error("Refusing to ingest into the demo tenant in production.");
  }

  const PURSUITS: PursuitData[] = loadPursuits();

  console.log(`Ingesting ${PURSUITS.length} real pursuits into tenant ${ORG}`);
  console.log(`Records read from ${pursuitDataDir()} (outside the repo)`);
  console.log(`Artifact references resolve against ${PURSUIT_ROOT} (reference only — no uploads)\n`);

  if (DRY_RUN) {
    for (const p of PURSUITS) {
      console.log(`  [dry-run] ${p.identity.internalName} → ${oppId(p)}`);
      for (const a of p.artifacts) {
        console.log(`             ref ${PURSUIT_ROOT}/${p.folder}/${a.path} [${a.sensitivityMarking}]`);
      }
    }
    console.log("\nDry run — nothing written.");
    return;
  }

  for (const p of PURSUITS) {
    await ingestPursuit(p);
  }

  console.log("\nIngest complete.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
