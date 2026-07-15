/**
 * Shape of a real (non-demo) pursuit record, as a runtime-validated schema.
 *
 * NO BID DATA LIVES IN THIS REPO. This file describes the shape only; the actual
 * pursuit records are JSON under `PURSUIT_DATA_DIR` (default
 * `~/Contracting/.bizops-pursuits/`), outside version control. That is deliberate:
 * a pursuit record carries live pricing, rate cards, and negotiating position on
 * procurements that have not been awarded, and this repository is public. Bid data
 * belongs in MacTech's Postgres, never in a build artifact.
 *
 * The records are transcribed from the source documents in each pursuit folder —
 * the sub-bid letter, the pricing workbook, the execution manifest. Fields the
 * documents do not state are null rather than guessed; `pWin` is the live example
 * (never stated in any source), which is why the Active Bids page does not lead
 * with it.
 *
 * ARTIFACTS ARE REFERENCES, NOT BINARIES. `artifacts[].path` is a path relative to
 * the pursuit folder, stored in `GovConDocument.storageReference`. No file content
 * is read or uploaded — the folders hold CUI-marked material and MacTech routes CUI
 * through its secure portal, not a commercial PaaS.
 */

import { z } from "zod";
import {
  GovConBidOutcome,
  GovConCompetitionType,
  GovConDocumentCategory,
  GovConDocumentStatus,
  GovConHealth,
  GovConMilestoneStatus,
  GovConMilestoneType,
  GovConOpportunityType,
  GovConPriority,
  GovConSeverity,
  GovConStage,
  GovConTaskStatus,
  GovConTeamRole,
} from "@prisma/client";

/** YYYY-MM-DD. The ingest anchors these at 12:00 UTC — see `date()` there. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected a YYYY-MM-DD calendar date");

const slug = z.string().min(1).regex(/^[a-z0-9-]+$/, "expected a kebab-case slug");

export const pursuitArtifactSchema = z.object({
  key: slug,
  name: z.string().min(1),
  /** Relative to the pursuit folder. Absolute paths would leak the operator's layout. */
  path: z.string().min(1).refine((p) => !p.startsWith("/"), "path must be relative to the pursuit folder"),
  category: z.nativeEnum(GovConDocumentCategory),
  status: z.nativeEnum(GovConDocumentStatus),
  sensitivityMarking: z.enum(["CUI", "PROPRIETARY", "PUBLIC"]),
  version: z.string().nullish(),
  effectiveDate: isoDate.nullish(),
  notes: z.string(),
});

export const pursuitRiskSchema = z.object({
  key: slug,
  title: z.string().min(1),
  description: z.string(),
  category: z.string(),
  severity: z.nativeEnum(GovConSeverity),
  likelihood: z.enum(["high", "medium", "low"]),
  mitigation: z.string(),
});

export const pursuitMilestoneSchema = z.object({
  key: slug,
  title: z.string().min(1),
  type: z.nativeEnum(GovConMilestoneType),
  /** Null when the source states a relative date only (e.g. "NTP + 14 days"). */
  dueAt: isoDate.nullable(),
  status: z.nativeEnum(GovConMilestoneStatus),
  notes: z.string(),
});

export const pursuitOpenItemSchema = z.object({
  key: slug,
  title: z.string().min(1),
  description: z.string(),
  /** The party who owes the answer. External parties have no Hub user id. */
  blockedOn: z.string().min(1),
  priority: z.nativeEnum(GovConPriority),
  status: z.nativeEnum(GovConTaskStatus),
  dueAt: isoDate.nullish(),
});

export const pursuitContactSchema = z.object({
  key: slug,
  name: z.string().min(1),
  title: z.string().nullable(),
  organization: z.string().min(1),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  side: z.enum(["government", "prime", "sub", "mactech"]),
});

export const pursuitSchema = z
  .object({
    key: slug,
    /** Folder name under PURSUIT_ROOT, e.g. "OCP". */
    folder: z.string().min(1),

    identity: z.object({
      internalName: z.string().min(1),
      solicitationTitle: z.string(),
      solicitationNumber: z.string(),
      noticeId: z.string().nullable(),
      type: z.nativeEnum(GovConOpportunityType),
      agencyName: z.string().min(1),
      agencyAbbreviation: z.string(),
      subAgency: z.string().nullable(),
      command: z.string().nullable(),
      contractingOffice: z.string().nullable(),
      placeOfPerformance: z.string().nullable(),
      naics: z.string().nullable(),
      setAside: z.string().nullable(),
      competitionType: z.nativeEnum(GovConCompetitionType),
      contractType: z.string().nullable(),
      teamRole: z.nativeEnum(GovConTeamRole),
      sourceSystem: z.string().nullable(),
    }),

    commercial: z.object({
      /** MacTech's basis of bid — NOT the prime contract magnitude. */
      estimatedValue: z.number().nonnegative(),
      minValue: z.number().nonnegative().nullable(),
      /** Basis of bid + every live adder/alternate. */
      maxValue: z.number().nonnegative().nullable(),
      periodOfPerformanceMonths: z.number().int().positive().nullable(),
      /** Prime-level magnitude, held as prose so it never enters pipeline math. */
      projectMagnitudeNote: z.string().nullable(),
      priceValidUntil: isoDate.nullable(),
    }),

    dates: z.object({
      postedDate: isoDate.nullable(),
      responseDeadline: isoDate.nullable(),
      questionsDeadline: isoDate.nullable(),
      proposalDeadline: isoDate.nullable(),
      expectedAwardDate: isoDate.nullable(),
      siteVisitDate: isoDate.nullable(),
    }),

    status: z.object({
      stage: z.nativeEnum(GovConStage),
      health: z.nativeEnum(GovConHealth),
      priority: z.nativeEnum(GovConPriority),
      /** Null unless a source document actually states one. Do not invent it. */
      pWin: z.number().int().min(0).max(100).nullable(),
      bidOutcome: z.nativeEnum(GovConBidOutcome),
      nextAction: z.string().min(1),
      nextActionDueAt: isoDate.nullable(),
      lastActivityAt: isoDate.nullable(),
    }),

    narrative: z.object({
      bidDecisionSummary: z.string(),
      winThemes: z.string(),
      discriminators: z.string(),
      customerPainPoints: z.string(),
      solutionHypothesis: z.string(),
      pricingHypothesis: z.string(),
      keyPersonnelNeeds: z.string(),
      clearanceNeeds: z.string(),
      complianceRequirements: z.string(),
    }),

    risks: z.array(pursuitRiskSchema),
    milestones: z.array(pursuitMilestoneSchema),
    openItems: z.array(pursuitOpenItemSchema),
    contacts: z.array(pursuitContactSchema),
    artifacts: z.array(pursuitArtifactSchema),

    /** Known gaps in the source record. Surfaced, not swept under. */
    dataQualityNotes: z.array(z.string()),
  })
  .superRefine((p, ctx) => {
    const { estimatedValue, minValue, maxValue } = p.commercial;
    if (maxValue !== null && maxValue < estimatedValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["commercial", "maxValue"],
        message: "maxValue is the basis of bid plus live adders, so it cannot be below estimatedValue",
      });
    }
    if (minValue !== null && minValue > estimatedValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["commercial", "minValue"],
        message: "minValue is the lowest electable option, so it cannot exceed estimatedValue",
      });
    }
    // Duplicate keys would collide on the deterministic row ids and silently
    // overwrite each other mid-ingest.
    for (const field of ["risks", "milestones", "openItems", "contacts", "artifacts"] as const) {
      const keys = p[field].map((x) => x.key);
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      if (dupes.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `duplicate keys would collide on ingest: ${[...new Set(dupes)].join(", ")}`,
        });
      }
    }
  });

export type PursuitData = z.infer<typeof pursuitSchema>;
export type PursuitArtifact = z.infer<typeof pursuitArtifactSchema>;
