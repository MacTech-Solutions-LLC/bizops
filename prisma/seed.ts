/**
 * GovCon Ops demo seed — idempotent and clearly marked fictional.
 *
 * All rows are written for the demo tenant `org_acme` (the mock Hub org used in
 * local/dev), carry `isDemo: true`, and use a "[DEMO]" marker in visible names so
 * they can never be mistaken for MacTech's real business pipeline. Every row uses
 * a stable explicit id and is upserted, so repeated runs never create duplicates.
 *
 * Never run against production (guarded below unless SEED_ALLOW_PROD=1).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Demo tenant — matches the mock Hub fixture org (`org_acme`). */
const ORG = process.env.SEED_DEMO_ORG_ID ?? "org_acme";
const ACTOR = "hub_user_admin";
const now = new Date();

function daysFromNow(days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PROD !== "1") {
    throw new Error(
      "Refusing to run the demo seed in production. Set SEED_ALLOW_PROD=1 to override.",
    );
  }
  console.log(`Seeding GovCon Ops demo data for tenant ${ORG} …`);

  await seedAgencies();
  await seedOffices();
  await seedVehicles();
  await seedPartners();
  await seedContacts();
  await seedOpportunities();
  await seedMilestones();
  await seedTasks();
  await seedProposals();
  await seedReviews();
  await seedReadiness();
  await seedSbir();
  await seedActivity();

  console.log("Demo seed complete.");
}

// --- Agencies ---------------------------------------------------------------

const AGENCIES = [
  { key: "dhs", name: "[DEMO] Department of Homeland Security", abbreviation: "DHS" },
  { key: "usaf", name: "[DEMO] Department of the Air Force", abbreviation: "USAF" },
  { key: "navy", name: "[DEMO] Department of the Navy", abbreviation: "DON" },
  { key: "va", name: "[DEMO] Department of Veterans Affairs", abbreviation: "VA" },
  { key: "army", name: "[DEMO] Department of the Army", abbreviation: "USA" },
  { key: "nasa", name: "[DEMO] National Aeronautics and Space Administration", abbreviation: "NASA" },
];

function agencyId(key: string) {
  return `demo-agency-${key}`;
}

async function seedAgencies() {
  for (const a of AGENCIES) {
    await prisma.govConAgency.upsert({
      where: { id: agencyId(a.key) },
      create: {
        id: agencyId(a.key),
        hubOrganizationId: ORG,
        name: a.name,
        abbreviation: a.abbreviation,
        tier: "cabinet",
        isDemo: true,
        createdBy: ACTOR,
      },
      update: { name: a.name, abbreviation: a.abbreviation, isDemo: true },
    });
  }
}

const OFFICES = [
  { key: "dhs-cisa", agency: "dhs", name: "[DEMO] CISA", command: "Cybersecurity Division" },
  { key: "navy-navwar", agency: "navy", name: "[DEMO] NAVWAR", command: "Naval Information Warfare Systems Command" },
  { key: "army-peo", agency: "army", name: "[DEMO] PEO EIS", command: "Enterprise Information Systems" },
];

function officeId(key: string) {
  return `demo-office-${key}`;
}

async function seedOffices() {
  for (const o of OFFICES) {
    await prisma.govConOffice.upsert({
      where: { id: officeId(o.key) },
      create: {
        id: officeId(o.key),
        hubOrganizationId: ORG,
        agencyId: agencyId(o.agency),
        name: o.name,
        command: o.command,
        isDemo: true,
      },
      update: { name: o.name, command: o.command, isDemo: true },
    });
  }
}

// --- Vehicles ---------------------------------------------------------------

const VEHICLES = [
  {
    key: "gsa-mas",
    name: "[DEMO] GSA Multiple Award Schedule (IT)",
    vehicleType: "GSA Schedule",
    agency: "GSA",
    subcontractAccess: false,
    status: "ACTIVE" as const,
  },
  {
    key: "cio-sp4",
    name: "[DEMO] CIO-SP4",
    vehicleType: "GWAC",
    agency: "NIH NITAAC",
    subcontractAccess: true,
    status: "PURSUING" as const,
  },
];

function vehicleId(key: string) {
  return `demo-vehicle-${key}`;
}

async function seedVehicles() {
  for (const v of VEHICLES) {
    await prisma.govConContractVehicle.upsert({
      where: { id: vehicleId(v.key) },
      create: {
        id: vehicleId(v.key),
        hubOrganizationId: ORG,
        name: v.name,
        vehicleType: v.vehicleType,
        agency: v.agency,
        subcontractAccess: v.subcontractAccess,
        status: v.status,
        naicsCodes: ["541512", "541519"],
        isDemo: true,
      },
      update: { name: v.name, status: v.status, isDemo: true },
    });
  }
}

// --- Partners ---------------------------------------------------------------

const PARTNERS = [
  { key: "orion", legalName: "[DEMO] Orion Defense Systems LLC", size: "SMALL" as const, socio: ["SDVOSB"], nda: "EXECUTED" as const, teaming: "EXECUTED" as const },
  { key: "meridian", legalName: "[DEMO] Meridian Cyber Group Inc.", size: "SMALL" as const, socio: ["8(a)", "HUBZone"], nda: "EXECUTED" as const, teaming: "IN_NEGOTIATION" as const },
  { key: "atlas", legalName: "[DEMO] Atlas Analytics Corporation", size: "OTHER_THAN_SMALL" as const, socio: [], nda: "REQUESTED" as const, teaming: "NONE" as const },
  { key: "beacon", legalName: "[DEMO] Beacon Cloud Partners LLC", size: "SMALL" as const, socio: ["WOSB"], nda: "NONE" as const, teaming: "NONE" as const },
];

function partnerId(key: string) {
  return `demo-partner-${key}`;
}

async function seedPartners() {
  for (const p of PARTNERS) {
    await prisma.govConPartner.upsert({
      where: { id: partnerId(p.key) },
      create: {
        id: partnerId(p.key),
        hubOrganizationId: ORG,
        legalName: p.legalName,
        businessSize: p.size,
        socioeconomicStatus: p.socio,
        naicsCapabilities: ["541512", "541511"],
        keyCapabilities: "Cybersecurity, cloud engineering, data analytics",
        ndaStatus: p.nda,
        teamingStatus: p.teaming,
        relationshipOwner: ACTOR,
        isDemo: true,
        createdBy: ACTOR,
      },
      update: { legalName: p.legalName, ndaStatus: p.nda, teamingStatus: p.teaming, isDemo: true },
    });
    await prisma.govConPartnerContact.upsert({
      where: { id: `demo-pc-${p.key}` },
      create: {
        id: `demo-pc-${p.key}`,
        hubOrganizationId: ORG,
        partnerId: partnerId(p.key),
        name: "[DEMO] BD Lead",
        title: "Director, Business Development",
        email: `bd@${p.key}.example`,
        isPrimary: true,
      },
      update: {},
    });
  }
}

// --- Contacts ---------------------------------------------------------------

async function seedContacts() {
  const contacts = [
    { key: "dhs-co", name: "[DEMO] Dana Reyes", title: "Contracting Officer", agency: "dhs", office: "dhs-cisa", role: "CO" },
    { key: "navy-cor", name: "[DEMO] Marcus Webb", title: "COR", agency: "navy", office: "navy-navwar", role: "COR" },
    { key: "army-pm", name: "[DEMO] Priya Nair", title: "Program Manager", agency: "army", office: "army-peo", role: "PM" },
  ];
  for (const c of contacts) {
    await prisma.govConContact.upsert({
      where: { id: `demo-contact-${c.key}` },
      create: {
        id: `demo-contact-${c.key}`,
        hubOrganizationId: ORG,
        name: c.name,
        title: c.title,
        agencyId: agencyId(c.agency),
        officeId: officeId(c.office),
        acquisitionRole: c.role,
        contactType: "government",
        influence: "high",
        relationshipStrength: "moderate",
        isDemo: true,
        createdBy: ACTOR,
      },
      update: { name: c.name, title: c.title, isDemo: true },
    });
  }
}

// --- Opportunities ----------------------------------------------------------

const OPPORTUNITIES = [
  {
    key: "dhs-cyber",
    internalName: "[DEMO] DHS Cyber Modernization",
    solicitationTitle: "Enterprise Cybersecurity Modernization Services",
    solicitationNumber: "70RCSA24R00000001",
    type: "RFP" as const,
    agency: "dhs",
    office: "dhs-cisa",
    stage: "PROPOSAL" as const,
    health: "AT_RISK" as const,
    priority: "HIGH" as const,
    teamRole: "PRIME" as const,
    pWin: 55,
    estimatedValue: 48000000,
    proposalDeadlineDays: 21,
    vehicle: "gsa-mas",
  },
  {
    key: "af-sbir",
    internalName: "[DEMO] Air Force SBIR Phase I — Autonomous ISR",
    solicitationTitle: "AF SBIR 24.1 — Autonomous ISR Data Fusion",
    solicitationNumber: "AF241-0001",
    type: "SBIR" as const,
    agency: "usaf",
    stage: "CAPTURE" as const,
    health: "ON_TRACK" as const,
    priority: "MEDIUM" as const,
    teamRole: "PRIME" as const,
    pWin: 40,
    estimatedValue: 150000,
    proposalDeadlineDays: 35,
  },
  {
    key: "navy-rmf",
    internalName: "[DEMO] Navy RMF Support",
    solicitationTitle: "Risk Management Framework A&A Support Services",
    solicitationNumber: "N0003924Q0000",
    type: "IDIQ_TASK_ORDER" as const,
    agency: "navy",
    office: "navy-navwar",
    stage: "QUALIFIED" as const,
    health: "ON_TRACK" as const,
    priority: "MEDIUM" as const,
    teamRole: "SUBCONTRACTOR" as const,
    pWin: 35,
    estimatedValue: 12500000,
    proposalDeadlineDays: 48,
  },
  {
    key: "va-cloud",
    internalName: "[DEMO] VA Cloud Migration",
    solicitationTitle: "Enterprise Cloud Migration and Managed Services",
    solicitationNumber: "36C10B24R0000",
    type: "RFP" as const,
    agency: "va",
    stage: "BID_NO_BID" as const,
    health: "AT_RISK" as const,
    priority: "HIGH" as const,
    teamRole: "PRIME" as const,
    pWin: 45,
    estimatedValue: 32000000,
    proposalDeadlineDays: 14,
    vehicle: "cio-sp4",
  },
  {
    key: "army-data",
    internalName: "[DEMO] Army Data Platform",
    solicitationTitle: "Enterprise Data Platform Engineering",
    solicitationNumber: "W52P1J24R0000",
    type: "RFP" as const,
    agency: "army",
    office: "army-peo",
    stage: "SUBMITTED" as const,
    health: "ON_TRACK" as const,
    priority: "CRITICAL" as const,
    teamRole: "PRIME" as const,
    pWin: 60,
    estimatedValue: 75000000,
    proposalDeadlineDays: -5,
  },
  {
    key: "nasa-sbir2",
    internalName: "[DEMO] NASA SBIR Phase II — Edge Compute",
    solicitationTitle: "NASA SBIR 2024 Phase II — Radiation-Tolerant Edge Compute",
    solicitationNumber: "NASA-SBIR-24-2-S1.01",
    type: "SBIR" as const,
    agency: "nasa",
    stage: "EVALUATION" as const,
    health: "ON_TRACK" as const,
    priority: "MEDIUM" as const,
    teamRole: "PRIME" as const,
    pWin: 50,
    estimatedValue: 850000,
    proposalDeadlineDays: -20,
  },
];

function oppId(key: string) {
  return `demo-opp-${key}`;
}

async function seedOpportunities() {
  for (const o of OPPORTUNITIES) {
    const id = oppId(o.key);
    const data = {
      hubOrganizationId: ORG,
      internalName: o.internalName,
      solicitationTitle: o.solicitationTitle,
      solicitationNumber: o.solicitationNumber,
      type: o.type,
      agencyId: agencyId(o.agency),
      officeId: o.office ? officeId(o.office) : null,
      vehicleId: o.vehicle ? vehicleId(o.vehicle) : null,
      stage: o.stage,
      health: o.health,
      priority: o.priority,
      teamRole: o.teamRole,
      pWin: o.pWin,
      pGo: Math.min(100, o.pWin + 20),
      estimatedValue: o.estimatedValue,
      naics: "541512",
      sourceSystem: "SAM.gov",
      postedDate: daysFromNow(-30),
      proposalDeadline: daysFromNow(o.proposalDeadlineDays),
      responseDeadline: daysFromNow(o.proposalDeadlineDays),
      captureOwnerId: ACTOR,
      proposalManagerId: ACTOR,
      nextAction: "Advance capture plan and confirm teaming",
      nextActionDueAt: daysFromNow(Math.max(1, o.proposalDeadlineDays - 7)),
      lastActivityAt: daysFromNow(-1),
      isDemo: true,
      createdBy: ACTOR,
      updatedBy: ACTOR,
    };
    await prisma.govConOpportunity.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    // Ensure a stage-history seed row exists (idempotent by deterministic id).
    await prisma.govConOpportunityStageHistory.upsert({
      where: { id: `demo-sh-${o.key}` },
      create: {
        id: `demo-sh-${o.key}`,
        hubOrganizationId: ORG,
        opportunityId: id,
        fromStage: null,
        toStage: o.stage,
        changedBy: ACTOR,
        note: "Seeded demo pursuit",
      },
      update: {},
    });
    // Attach a teaming partner to a couple of pursuits.
    if (o.key === "dhs-cyber" || o.key === "va-cloud") {
      await prisma.govConOpportunityPartner.upsert({
        where: { opportunityId_partnerId: { opportunityId: id, partnerId: partnerId("orion") } },
        create: {
          hubOrganizationId: ORG,
          opportunityId: id,
          partnerId: partnerId("orion"),
          role: "SUBCONTRACTOR",
          workshare: 30,
          ndaStatus: "EXECUTED",
          teamingStatus: "EXECUTED",
        },
        update: {},
      });
    }
    // A capture plan for the two prime pursuits in capture/proposal.
    if (o.key === "dhs-cyber" || o.key === "af-sbir") {
      await prisma.govConCapturePlan.upsert({
        where: { opportunityId: id },
        create: {
          id: `demo-cap-${o.key}`,
          hubOrganizationId: ORG,
          opportunityId: id,
          ownerId: ACTOR,
          customerMission: "[DEMO] Protect and modernize mission systems.",
          customerProblem: "[DEMO] Legacy tooling and fragmented visibility.",
          winThemes: "[DEMO] Proven zero-trust delivery; cleared staff; low transition risk.",
          discriminators: "[DEMO] Incumbent-independent accelerators and automation.",
        },
        update: {},
      });
    }
    // A risk on the at-risk pursuits.
    if (o.health === "AT_RISK") {
      await prisma.govConRisk.upsert({
        where: { id: `demo-risk-${o.key}` },
        create: {
          id: `demo-risk-${o.key}`,
          hubOrganizationId: ORG,
          opportunityId: id,
          title: "[DEMO] Key personnel availability",
          category: "staffing",
          severity: "HIGH",
          likelihood: "medium",
          mitigation: "Line up contingent letters of commitment.",
          ownerId: ACTOR,
          status: "OPEN",
        },
        update: {},
      });
    }
    // Submission + outcome for closed-stage pursuits.
    if (o.stage === "SUBMITTED" || o.stage === "EVALUATION") {
      await prisma.govConSubmission.upsert({
        where: { opportunityId: id },
        create: {
          id: `demo-sub-${o.key}`,
          hubOrganizationId: ORG,
          opportunityId: id,
          submittedAt: daysFromNow(o.proposalDeadlineDays),
          method: "portal",
          portal: "SAM.gov",
          confirmationNumber: `DEMO-${o.key.toUpperCase()}-CONF`,
          submittedBy: ACTOR,
          proposedValue: o.estimatedValue,
        },
        update: {},
      });
    }
  }
}

// --- Milestones -------------------------------------------------------------

async function seedMilestones() {
  const specs = [
    { opp: "dhs-cyber", type: "PINK_TEAM" as const, title: "[DEMO] Pink Team Review", due: 7 },
    { opp: "dhs-cyber", type: "RED_TEAM" as const, title: "[DEMO] Red Team Review", due: 14 },
    { opp: "dhs-cyber", type: "SUBMISSION" as const, title: "[DEMO] Proposal Submission", due: 21 },
    { opp: "va-cloud", type: "BID_NO_BID_REVIEW" as const, title: "[DEMO] Bid/No-Bid Gate", due: 3 },
    { opp: "navy-rmf", type: "QUESTIONS_DUE" as const, title: "[DEMO] Questions Due", due: 10 },
    { opp: "af-sbir", type: "SBIR_FULL_PROPOSAL" as const, title: "[DEMO] SBIR Full Proposal Due", due: 35 },
    { opp: "army-data", type: "EXPECTED_AWARD" as const, title: "[DEMO] Expected Award", due: 30 },
  ];
  for (const m of specs) {
    await prisma.govConMilestone.upsert({
      where: { id: `demo-ms-${m.opp}-${m.type}` },
      create: {
        id: `demo-ms-${m.opp}-${m.type}`,
        hubOrganizationId: ORG,
        opportunityId: oppId(m.opp),
        type: m.type,
        title: m.title,
        dueAt: daysFromNow(m.due),
        status: "SCHEDULED",
        ownerId: ACTOR,
        isDemo: true,
        createdBy: ACTOR,
      },
      update: { title: m.title, dueAt: daysFromNow(m.due), isDemo: true },
    });
  }
}

// --- Tasks ------------------------------------------------------------------

async function seedTasks() {
  const specs = [
    { key: "t1", opp: "dhs-cyber", title: "[DEMO] Draft technical volume outline", status: "IN_PROGRESS" as const, priority: "HIGH" as const, due: 5 },
    { key: "t2", opp: "dhs-cyber", title: "[DEMO] Confirm key personnel resumes", status: "TODO" as const, priority: "HIGH" as const, due: 8 },
    { key: "t3", opp: "va-cloud", title: "[DEMO] Complete bid/no-bid scorecard", status: "INTERNAL_REVIEW" as const, priority: "CRITICAL" as const, due: 2 },
    { key: "t4", opp: "navy-rmf", title: "[DEMO] Draft questions to CO", status: "TODO" as const, priority: "MEDIUM" as const, due: 9 },
    { key: "t5", opp: "af-sbir", title: "[DEMO] Write innovation summary", status: "BACKLOG" as const, priority: "MEDIUM" as const, due: 20 },
    { key: "t6", opp: "army-data", title: "[DEMO] Capture debrief notes", status: "COMPLETE" as const, priority: "LOW" as const, due: -2 },
  ];
  for (const t of specs) {
    await prisma.govConTask.upsert({
      where: { id: `demo-task-${t.key}` },
      create: {
        id: `demo-task-${t.key}`,
        hubOrganizationId: ORG,
        opportunityId: oppId(t.opp),
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: ACTOR,
        creatorId: ACTOR,
        dueAt: daysFromNow(t.due),
        completedAt: t.status === "COMPLETE" ? daysFromNow(t.due) : null,
        isDemo: true,
        createdBy: ACTOR,
      },
      update: { title: t.title, status: t.status, isDemo: true },
    });
  }
}

// --- Proposals, volumes, requirements --------------------------------------

async function seedProposals() {
  const propId = "demo-proposal-dhs";
  await prisma.govConProposal.upsert({
    where: { id: propId },
    create: {
      id: propId,
      hubOrganizationId: ORG,
      opportunityId: oppId("dhs-cyber"),
      title: "[DEMO] DHS Cyber Modernization — Proposal",
      managerId: ACTOR,
      status: "IN_PROGRESS",
      dueAt: daysFromNow(21),
    },
    update: { status: "IN_PROGRESS" },
  });

  const volumes = [
    { key: "tech", name: "Technical", status: "IN_PROGRESS" as const, order: 1, pageLimit: 40 },
    { key: "mgmt", name: "Management", status: "NOT_STARTED" as const, order: 2, pageLimit: 20 },
    { key: "past", name: "Past Performance", status: "INTERNAL_REVIEW" as const, order: 3, pageLimit: 15 },
    { key: "price", name: "Pricing", status: "NOT_STARTED" as const, order: 4, pageLimit: 10 },
  ];
  for (const v of volumes) {
    await prisma.govConProposalVolume.upsert({
      where: { id: `demo-vol-${v.key}` },
      create: {
        id: `demo-vol-${v.key}`,
        hubOrganizationId: ORG,
        proposalId: propId,
        name: `[DEMO] ${v.name}`,
        ownerId: ACTOR,
        status: v.status,
        orderIndex: v.order,
        pageLimit: v.pageLimit,
        dueAt: daysFromNow(18),
      },
      update: { status: v.status },
    });
  }

  const reqs = [
    { key: "L31", refId: "L.3.1", text: "[DEMO] Provide a technical approach for zero-trust architecture.", type: "SHALL" as const, vol: "tech", status: "ASSIGNED" as const },
    { key: "L32", refId: "L.3.2", text: "[DEMO] Describe management approach and staffing plan.", type: "SHALL" as const, vol: "mgmt", status: "UNASSIGNED" as const },
    { key: "M1", refId: "M.1", text: "[DEMO] Demonstrate relevant past performance (3 references).", type: "EVALUATION_CRITERIA" as const, vol: "past", status: "IN_REVIEW" as const },
    { key: "L4", refId: "L.4", text: "[DEMO] Submit fully burdened pricing by CLIN.", type: "INSTRUCTION" as const, vol: "price", status: "UNASSIGNED" as const },
  ];
  for (const r of reqs) {
    await prisma.govConRequirement.upsert({
      where: { id: `demo-req-${r.key}` },
      create: {
        id: `demo-req-${r.key}`,
        hubOrganizationId: ORG,
        opportunityId: oppId("dhs-cyber"),
        proposalId: propId,
        volumeId: `demo-vol-${r.vol}`,
        refId: r.refId,
        text: r.text,
        requirementType: r.type,
        status: r.status,
        ownerId: r.status === "UNASSIGNED" ? null : ACTOR,
      },
      update: { status: r.status },
    });
  }
}

// --- Reviews + findings -----------------------------------------------------

async function seedReviews() {
  const reviewId = "demo-review-dhs-pink";
  await prisma.govConReview.upsert({
    where: { id: reviewId },
    create: {
      id: reviewId,
      hubOrganizationId: ORG,
      opportunityId: oppId("dhs-cyber"),
      proposalId: "demo-proposal-dhs",
      type: "PINK",
      scheduledAt: daysFromNow(7),
      scope: "[DEMO] Technical + Management volumes",
      reviewers: [ACTOR],
      status: "SCHEDULED",
      instructions: "[DEMO] Assess compliance and win-theme integration.",
    },
    update: { status: "SCHEDULED" },
  });
  const findings = [
    { key: "f1", summary: "[DEMO] Win themes not threaded through section 3.", severity: "MEDIUM" as const, status: "OPEN" as const },
    { key: "f2", summary: "[DEMO] Staffing plan missing surge approach.", severity: "HIGH" as const, status: "IN_PROGRESS" as const },
  ];
  for (const f of findings) {
    await prisma.govConReviewFinding.upsert({
      where: { id: `demo-finding-${f.key}` },
      create: {
        id: `demo-finding-${f.key}`,
        hubOrganizationId: ORG,
        reviewId,
        summary: f.summary,
        severity: f.severity,
        status: f.status,
        ownerId: ACTOR,
      },
      update: { status: f.status },
    });
  }
}

// --- Readiness --------------------------------------------------------------

async function seedReadiness() {
  const items = [
    { name: "[DEMO] SAM.gov Registration", category: "registration", status: "ACTIVE" as const, exp: 200 },
    { name: "[DEMO] Unique Entity ID (UEI)", category: "registration", status: "ACTIVE" as const, exp: null },
    { name: "[DEMO] CAGE Code", category: "registration", status: "ACTIVE" as const, exp: null },
    { name: "[DEMO] CMMC Level 2", category: "cyber", status: "IN_PROGRESS" as const, exp: null },
    { name: "[DEMO] NIST SP 800-171 SSP", category: "cyber", status: "ACTIVE" as const, exp: 90 },
    { name: "[DEMO] SDVOSB Certification", category: "certification", status: "EXPIRING_SOON" as const, exp: 20 },
    { name: "[DEMO] Facility Clearance (FCL)", category: "clearance", status: "ACTIVE" as const, exp: 400 },
    { name: "[DEMO] Cyber Insurance", category: "insurance", status: "EXPIRING_SOON" as const, exp: 25 },
    { name: "[DEMO] GSA Schedule Registration", category: "vehicle", status: "ACTIVE" as const, exp: 500 },
    { name: "[DEMO] DSBS Profile", category: "registration", status: "ACTIVE" as const, exp: null },
  ];
  for (const it of items) {
    await prisma.govConReadinessItem.upsert({
      where: { hubOrganizationId_name: { hubOrganizationId: ORG, name: it.name } },
      create: {
        hubOrganizationId: ORG,
        name: it.name,
        category: it.category,
        status: it.status,
        ownerId: ACTOR,
        expirationDate: it.exp === null ? null : daysFromNow(it.exp),
        reminderLeadDays: 30,
        isDemo: true,
        createdBy: ACTOR,
      },
      update: { status: it.status, expirationDate: it.exp === null ? null : daysFromNow(it.exp) },
    });
  }
}

// --- SBIR topics + assessments ---------------------------------------------

async function seedSbir() {
  const topics = [
    {
      key: "af-isr",
      program: "SBIR" as const,
      agency: "usaf",
      topicNumber: "AF241-0001",
      topicTitle: "[DEMO] Autonomous ISR Data Fusion",
      phase: "PHASE_I" as const,
      close: 35,
      opp: "af-sbir",
      rec: "pursue",
    },
    {
      key: "nasa-edge",
      program: "SBIR" as const,
      agency: "nasa",
      topicNumber: "S1.01",
      topicTitle: "[DEMO] Radiation-Tolerant Edge Compute",
      phase: "PHASE_II" as const,
      close: -20,
      opp: "nasa-sbir2",
      rec: "pursue",
    },
    {
      key: "army-ai",
      program: "STTR" as const,
      agency: "army",
      topicNumber: "A24B-T001",
      topicTitle: "[DEMO] Explainable AI for Logistics",
      phase: "PHASE_I" as const,
      close: 55,
      opp: null,
      rec: "watch",
    },
  ];
  for (const t of topics) {
    const id = `demo-sbir-${t.key}`;
    await prisma.govConSbirTopic.upsert({
      where: { id },
      create: {
        id,
        hubOrganizationId: ORG,
        program: t.program,
        agencyId: agencyId(t.agency),
        topicNumber: t.topicNumber,
        topicTitle: t.topicTitle,
        phase: t.phase,
        closeDate: daysFromNow(t.close),
        objective: "[DEMO] Advance a mission-relevant capability to prototype.",
        stage: t.opp ? "CAPTURE" : "SCREENING",
        opportunityId: t.opp ? oppId(t.opp) : null,
        isDemo: true,
        createdBy: ACTOR,
      },
      update: { topicTitle: t.topicTitle, closeDate: daysFromNow(t.close), isDemo: true },
    });
    await prisma.govConSbirAssessment.upsert({
      where: { sbirTopicId: id },
      create: {
        id: `demo-sbir-assess-${t.key}`,
        hubOrganizationId: ORG,
        sbirTopicId: id,
        missionAlignment: 5,
        technicalNovelty: 4,
        feasibility: 4,
        commercialization: t.rec === "pursue" ? 4 : 2,
        phaseIiiPathway: t.rec === "pursue" ? 4 : 2,
        teamCompleteness: 4,
        recommendation: t.rec,
      },
      update: { recommendation: t.rec },
    });
  }
}

// --- Activity ---------------------------------------------------------------

async function seedActivity() {
  const events = [
    { key: "a1", opp: "dhs-cyber", action: "opportunity.stage_changed", summary: "[DEMO] Stage QUALIFIED → PROPOSAL" },
    { key: "a2", opp: "va-cloud", action: "opportunity.created", summary: "[DEMO] Created opportunity" },
    { key: "a3", opp: "army-data", action: "opportunity.submission_recorded", summary: "[DEMO] Submission recorded" },
  ];
  for (const e of events) {
    await prisma.govConActivityEvent.upsert({
      where: { id: `demo-act-${e.key}` },
      create: {
        id: `demo-act-${e.key}`,
        hubOrganizationId: ORG,
        actorId: ACTOR,
        action: e.action,
        eventCategory: "capture",
        entityType: "GovConOpportunity",
        entityId: oppId(e.opp),
        opportunityId: oppId(e.opp),
        summary: e.summary,
      },
      update: {},
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
