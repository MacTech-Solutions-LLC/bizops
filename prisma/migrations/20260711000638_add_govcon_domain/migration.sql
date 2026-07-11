-- CreateEnum
CREATE TYPE "GovConStage" AS ENUM ('IDENTIFIED', 'SCREENING', 'QUALIFIED', 'CAPTURE', 'BID_NO_BID', 'PROPOSAL', 'SUBMITTED', 'EVALUATION', 'AWARDED', 'LOST', 'CANCELED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GovConHealth" AS ENUM ('ON_TRACK', 'AT_RISK', 'CRITICAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GovConPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GovConTeamRole" AS ENUM ('PRIME', 'SUBCONTRACTOR', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "GovConOpportunityType" AS ENUM ('PRIME_CONTRACT', 'SUBCONTRACT', 'RFP', 'RFQ', 'RFI', 'SOURCES_SOUGHT', 'PRESOLICITATION', 'IDIQ_TASK_ORDER', 'GSA', 'SBIR', 'STTR', 'BAA', 'OTA', 'GRANT', 'TEAMING', 'OTHER');

-- CreateEnum
CREATE TYPE "GovConCompetitionType" AS ENUM ('FULL_AND_OPEN', 'SMALL_BUSINESS_SET_ASIDE', 'EIGHT_A', 'SDVOSB_SET_ASIDE', 'WOSB_SET_ASIDE', 'HUBZONE_SET_ASIDE', 'SOLE_SOURCE', 'IDIQ_TASK_ORDER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GovConMilestoneType" AS ENUM ('BID_NO_BID_REVIEW', 'CAPTURE_REVIEW', 'NDA_DUE', 'TEAMING_AGREEMENT_DUE', 'QUESTIONS_DUE', 'INDUSTRY_DAY', 'SITE_VISIT', 'PINK_TEAM', 'RED_TEAM', 'GOLD_TEAM', 'PRICING_REVIEW', 'DRAFT_DUE', 'FINAL_PRODUCTION', 'SUBMISSION', 'ORAL_PRESENTATION', 'EXPECTED_AWARD', 'DEBRIEF', 'SBIR_ABSTRACT', 'SBIR_FULL_PROPOSAL', 'OTHER');

-- CreateEnum
CREATE TYPE "GovConMilestoneStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "GovConTaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'INTERNAL_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "GovConBidOutcome" AS ENUM ('PENDING', 'BID', 'CONDITIONAL_BID', 'HOLD', 'NO_BID');

-- CreateEnum
CREATE TYPE "GovConReviewType" AS ENUM ('BLUE', 'PINK', 'RED', 'GOLD', 'WHITE_GLOVE');

-- CreateEnum
CREATE TYPE "GovConReviewStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETE', 'CANCELED');

-- CreateEnum
CREATE TYPE "GovConSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GovConFindingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX');

-- CreateEnum
CREATE TYPE "GovConVolumeStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'INTERNAL_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "GovConRequirementType" AS ENUM ('SHALL', 'MUST', 'WILL', 'SHOULD', 'INSTRUCTION', 'EVALUATION_CRITERIA', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "GovConRequirementStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'DRAFTED', 'IN_REVIEW', 'COMPLETE');

-- CreateEnum
CREATE TYPE "GovConCaptureSectionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "GovConReadinessStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "GovConRiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GovConOutcomeResult" AS ENUM ('PENDING', 'AWARDED', 'LOST', 'NO_BID', 'CANCELED');

-- CreateEnum
CREATE TYPE "GovConNotificationType" AS ENUM ('ASSIGNMENT', 'MENTION', 'OVERDUE_TASK', 'DUE_SOON_MILESTONE', 'REVIEW_SCHEDULED', 'PARTNER_ACTION', 'READINESS_EXPIRING', 'SUBMISSION_DEADLINE', 'INACTIVE_PURSUIT', 'BID_DECISION_REQUEST', 'STAGE_CHANGE', 'COMMENT');

-- CreateEnum
CREATE TYPE "GovConPartnerAgreementStatus" AS ENUM ('NONE', 'REQUESTED', 'IN_NEGOTIATION', 'EXECUTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GovConBusinessSize" AS ENUM ('SMALL', 'OTHER_THAN_SMALL', 'LARGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GovConDocumentCategory" AS ENUM ('SOLICITATION', 'AMENDMENT', 'QA', 'CAPTURE', 'PROPOSAL_DRAFT', 'FINAL_PROPOSAL', 'PRICING', 'NDA', 'TEAMING_AGREEMENT', 'SUBCONTRACT', 'CAPABILITY_STATEMENT', 'PAST_PERFORMANCE', 'RESUME', 'CERTIFICATION', 'COMPLIANCE_EVIDENCE', 'AWARD', 'DEBRIEF', 'CORRESPONDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "GovConDocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'FINAL', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GovConVehicleStatus" AS ENUM ('PURSUING', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GovConSbirProgram" AS ENUM ('SBIR', 'STTR');

-- CreateEnum
CREATE TYPE "GovConSbirPhase" AS ENUM ('PHASE_I', 'PHASE_II', 'PHASE_III', 'DIRECT_TO_PHASE_II');

-- CreateTable
CREATE TABLE "GovConAgency" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "tier" TEXT,
    "parentAgencyId" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConOffice" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "command" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConContact" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "organizationName" TEXT,
    "agencyId" TEXT,
    "officeId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactType" TEXT,
    "acquisitionRole" TEXT,
    "decisionRole" TEXT,
    "influence" TEXT,
    "relationshipStrength" TEXT,
    "lastInteractionAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "meetingNotes" TEXT,
    "sensitivityNotes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConInteraction" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT,
    "summary" TEXT NOT NULL,
    "followUp" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "GovConInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConContractVehicle" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" TEXT,
    "agency" TEXT,
    "contractNumber" TEXT,
    "primeHolder" TEXT,
    "subcontractAccess" BOOLEAN NOT NULL DEFAULT false,
    "pools" TEXT[],
    "naicsCodes" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "optionPeriods" INTEGER,
    "ceiling" DECIMAL(16,2),
    "orderingStatus" TEXT,
    "status" "GovConVehicleStatus" NOT NULL DEFAULT 'PURSUING',
    "renewalActions" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConContractVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConPartner" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "dba" TEXT,
    "uei" TEXT,
    "cageCode" TEXT,
    "businessSize" "GovConBusinessSize" NOT NULL DEFAULT 'UNKNOWN',
    "socioeconomicStatus" TEXT[],
    "naicsCapabilities" TEXT[],
    "contractVehicles" TEXT[],
    "facilityClearance" TEXT,
    "keyCapabilities" TEXT,
    "pastPerformance" TEXT,
    "relationshipOwner" TEXT,
    "proposedRole" TEXT,
    "ndaStatus" "GovConPartnerAgreementStatus" NOT NULL DEFAULT 'NONE',
    "teamingStatus" "GovConPartnerAgreementStatus" NOT NULL DEFAULT 'NONE',
    "subcontractStatus" "GovConPartnerAgreementStatus" NOT NULL DEFAULT 'NONE',
    "risk" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConPartnerContact" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConPartnerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConOpportunity" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "solicitationTitle" TEXT,
    "solicitationNumber" TEXT,
    "noticeId" TEXT,
    "type" "GovConOpportunityType" NOT NULL DEFAULT 'RFP',
    "sourceSystem" TEXT,
    "sourceUrl" TEXT,
    "agencyId" TEXT,
    "subAgency" TEXT,
    "officeId" TEXT,
    "command" TEXT,
    "contractingOffice" TEXT,
    "placeOfPerformance" TEXT,
    "setAside" TEXT,
    "naics" TEXT,
    "psc" TEXT,
    "vehicleId" TEXT,
    "contractType" TEXT,
    "competitionType" "GovConCompetitionType" NOT NULL DEFAULT 'UNKNOWN',
    "estimatedValue" DECIMAL(16,2),
    "minValue" DECIMAL(16,2),
    "maxValue" DECIMAL(16,2),
    "ceiling" DECIMAL(16,2),
    "fundedValue" DECIMAL(16,2),
    "periodOfPerformanceMonths" INTEGER,
    "basePeriodMonths" INTEGER,
    "optionPeriods" INTEGER,
    "postedDate" TIMESTAMP(3),
    "responseDeadline" TIMESTAMP(3),
    "questionsDeadline" TIMESTAMP(3),
    "siteVisitDate" TIMESTAMP(3),
    "industryDayDate" TIMESTAMP(3),
    "draftSolicitationDate" TIMESTAMP(3),
    "finalSolicitationDate" TIMESTAMP(3),
    "proposalDeadline" TIMESTAMP(3),
    "expectedAwardDate" TIMESTAMP(3),
    "actualAwardDate" TIMESTAMP(3),
    "debriefDate" TIMESTAMP(3),
    "stage" "GovConStage" NOT NULL DEFAULT 'IDENTIFIED',
    "health" "GovConHealth" NOT NULL DEFAULT 'UNKNOWN',
    "priority" "GovConPriority" NOT NULL DEFAULT 'MEDIUM',
    "strategicFit" INTEGER,
    "pWin" INTEGER,
    "pGo" INTEGER,
    "teamRole" "GovConTeamRole" NOT NULL DEFAULT 'UNDECIDED',
    "incumbent" TEXT,
    "competitors" TEXT[],
    "customerPainPoints" TEXT,
    "customerHotButtons" TEXT,
    "discriminators" TEXT,
    "winThemes" TEXT,
    "ghostThemes" TEXT,
    "blackHatNotes" TEXT,
    "solutionHypothesis" TEXT,
    "pricingHypothesis" TEXT,
    "keyPersonnelNeeds" TEXT,
    "clearanceNeeds" TEXT,
    "facilityNeeds" TEXT,
    "complianceRequirements" TEXT,
    "bidDecisionSummary" TEXT,
    "bidRationale" TEXT,
    "noBidRationale" TEXT,
    "captureOwnerId" TEXT,
    "proposalManagerId" TEXT,
    "executiveSponsorId" TEXT,
    "nextAction" TEXT,
    "nextActionDueAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConOpportunityStageHistory" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "GovConStage",
    "toStage" "GovConStage" NOT NULL,
    "changedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConOpportunityStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConMilestone" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "GovConMilestoneType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "GovConMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "ownerId" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConOpportunityPartner" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "role" "GovConTeamRole" NOT NULL DEFAULT 'SUBCONTRACTOR',
    "workshare" INTEGER,
    "scope" TEXT,
    "ndaStatus" "GovConPartnerAgreementStatus" NOT NULL DEFAULT 'NONE',
    "teamingStatus" "GovConPartnerAgreementStatus" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConOpportunityPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConCapturePlan" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "ownerId" TEXT,
    "customerMission" TEXT,
    "customerProblem" TEXT,
    "acquisitionContext" TEXT,
    "procurementHistory" TEXT,
    "incumbentAnalysis" TEXT,
    "competitiveLandscape" TEXT,
    "stakeholderMap" TEXT,
    "relationshipMap" TEXT,
    "decisionRoles" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "competitorStrengths" TEXT,
    "competitorWeaknesses" TEXT,
    "discriminators" TEXT,
    "winThemes" TEXT,
    "ghostThemes" TEXT,
    "proofPoints" TEXT,
    "pastPerformanceAlignment" TEXT,
    "teamingGaps" TEXT,
    "staffingGaps" TEXT,
    "technicalGaps" TEXT,
    "readinessGaps" TEXT,
    "pricingPosture" TEXT,
    "captureActions" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConCapturePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConCaptureSection" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "capturePlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "ownerId" TEXT,
    "status" "GovConCaptureSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConCaptureSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConBidDecision" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "outcome" "GovConBidOutcome" NOT NULL DEFAULT 'PENDING',
    "weightedScore" DECIMAL(6,2),
    "maxScore" DECIMAL(6,2),
    "criteriaJson" JSONB,
    "rationale" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "requiredApprovers" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConBidDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConBidDecisionReview" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "bidDecisionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "vote" "GovConBidOutcome" NOT NULL DEFAULT 'PENDING',
    "score" DECIMAL(6,2),
    "comments" TEXT,
    "approved" BOOLEAN,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConBidDecisionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConProposal" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "managerId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "GovConVolumeStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConProposalVolume" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "reviewerId" TEXT,
    "contributors" TEXT[],
    "status" "GovConVolumeStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueAt" TIMESTAMP(3),
    "pageLimit" INTEGER,
    "currentPages" INTEGER,
    "outline" TEXT,
    "sourceMaterial" TEXT,
    "draftLocation" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConProposalVolume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConRequirement" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "proposalId" TEXT,
    "volumeId" TEXT,
    "refId" TEXT NOT NULL,
    "sourceSection" TEXT,
    "text" TEXT NOT NULL,
    "requirementType" "GovConRequirementType" NOT NULL DEFAULT 'SHALL',
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "responseSection" TEXT,
    "ownerId" TEXT,
    "status" "GovConRequirementStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "evidence" TEXT,
    "reviewerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConReview" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "proposalId" TEXT,
    "type" "GovConReviewType" NOT NULL DEFAULT 'PINK',
    "scheduledAt" TIMESTAMP(3),
    "scope" TEXT,
    "reviewers" TEXT[],
    "instructions" TEXT,
    "status" "GovConReviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConReviewFinding" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "severity" "GovConSeverity" NOT NULL DEFAULT 'MEDIUM',
    "ownerId" TEXT,
    "resolution" TEXT,
    "status" "GovConFindingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConReviewFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConTask" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "opportunityId" TEXT,
    "proposalId" TEXT,
    "proposalVolume" TEXT,
    "assigneeId" TEXT,
    "creatorId" TEXT,
    "watchers" TEXT[],
    "priority" "GovConPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "GovConTaskStatus" NOT NULL DEFAULT 'TODO',
    "startDate" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checklistJson" JSONB,
    "tags" TEXT[],
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConTaskDependency" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConTaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConComment" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "opportunityId" TEXT,
    "taskId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "parentCommentId" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConMention" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConNotification" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "GovConNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "opportunityId" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConSbirTopic" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "program" "GovConSbirProgram" NOT NULL DEFAULT 'SBIR',
    "component" TEXT,
    "agencyId" TEXT,
    "topicNumber" TEXT NOT NULL,
    "topicTitle" TEXT NOT NULL,
    "phase" "GovConSbirPhase" NOT NULL DEFAULT 'PHASE_I',
    "preReleaseDate" TIMESTAMP(3),
    "openDate" TIMESTAMP(3),
    "questionsDeadline" TIMESTAMP(3),
    "closeDate" TIMESTAMP(3),
    "technicalPoc" TEXT,
    "contractingPoc" TEXT,
    "objective" TEXT,
    "description" TEXT,
    "phaseIExpectations" TEXT,
    "phaseIIExpectations" TEXT,
    "phaseIIITransition" TEXT,
    "trl" INTEGER,
    "deliverables" TEXT,
    "awardRangeMin" DECIMAL(16,2),
    "awardRangeMax" DECIMAL(16,2),
    "periodOfPerformanceMonths" INTEGER,
    "eligibilityNotes" TEXT,
    "dataRightsNotes" TEXT,
    "requiredRegistrations" TEXT[],
    "submissionPortal" TEXT,
    "sourceUrl" TEXT,
    "stage" "GovConStage" NOT NULL DEFAULT 'IDENTIFIED',
    "opportunityId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConSbirTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConSbirAssessment" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "sbirTopicId" TEXT NOT NULL,
    "missionAlignment" INTEGER,
    "technicalNovelty" INTEGER,
    "feasibility" INTEGER,
    "existingIp" INTEGER,
    "piAvailability" INTEGER,
    "commercialization" INTEGER,
    "phaseIiiPathway" INTEGER,
    "transitionSponsor" INTEGER,
    "pastPerformance" INTEGER,
    "teamCompleteness" INTEGER,
    "timeRemaining" INTEGER,
    "proposalEffort" INTEGER,
    "expectedAwardValue" DECIMAL(16,2),
    "competitiveIntensity" INTEGER,
    "weightedScore" DECIMAL(6,2),
    "recommendation" TEXT,
    "technicalConcept" TEXT,
    "workPlan" TEXT,
    "keyPersonnel" TEXT,
    "commercializationPlan" TEXT,
    "transitionPlan" TEXT,
    "dataRights" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConSbirAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConDocument" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GovConDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "version" TEXT,
    "status" "GovConDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT,
    "opportunityId" TEXT,
    "partnerId" TEXT,
    "proposalId" TEXT,
    "storageProvider" TEXT,
    "storageReference" TEXT,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "sensitivityMarking" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConReadinessItem" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "GovConReadinessStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerId" TEXT,
    "issuer" TEXT,
    "identifier" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "evidenceLink" TEXT,
    "reminderLeadDays" INTEGER DEFAULT 30,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConReadinessItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConRisk" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "severity" "GovConSeverity" NOT NULL DEFAULT 'MEDIUM',
    "likelihood" TEXT,
    "mitigation" TEXT,
    "ownerId" TEXT,
    "status" "GovConRiskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConSubmission" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "method" TEXT,
    "portal" TEXT,
    "confirmationNumber" TEXT,
    "submittedBy" TEXT,
    "proposedValue" DECIMAL(16,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConOutcome" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "result" "GovConOutcomeResult" NOT NULL DEFAULT 'PENDING',
    "awardedValue" DECIMAL(16,2),
    "awardedTo" TEXT,
    "decidedAt" TIMESTAMP(3),
    "reason" TEXT,
    "lessonsLearned" TEXT,
    "debriefRequested" BOOLEAN NOT NULL DEFAULT false,
    "debriefDate" TIMESTAMP(3),
    "debriefNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "GovConOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConSavedView" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConTag" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConTagOnOpportunity" (
    "hubOrganizationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConTagOnOpportunity_pkey" PRIMARY KEY ("tagId","opportunityId")
);

-- CreateTable
CREATE TABLE "GovConActivityEvent" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "eventCategory" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "summary" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovConAgency_hubOrganizationId_idx" ON "GovConAgency"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConAgency_hubOrganizationId_name_key" ON "GovConAgency"("hubOrganizationId", "name");

-- CreateIndex
CREATE INDEX "GovConOffice_hubOrganizationId_idx" ON "GovConOffice"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConOffice_agencyId_idx" ON "GovConOffice"("agencyId");

-- CreateIndex
CREATE INDEX "GovConContact_hubOrganizationId_idx" ON "GovConContact"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConContact_agencyId_idx" ON "GovConContact"("agencyId");

-- CreateIndex
CREATE INDEX "GovConInteraction_hubOrganizationId_idx" ON "GovConInteraction"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConInteraction_contactId_idx" ON "GovConInteraction"("contactId");

-- CreateIndex
CREATE INDEX "GovConInteraction_opportunityId_idx" ON "GovConInteraction"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConContractVehicle_hubOrganizationId_idx" ON "GovConContractVehicle"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConContractVehicle_hubOrganizationId_name_key" ON "GovConContractVehicle"("hubOrganizationId", "name");

-- CreateIndex
CREATE INDEX "GovConPartner_hubOrganizationId_idx" ON "GovConPartner"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConPartnerContact_hubOrganizationId_idx" ON "GovConPartnerContact"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConPartnerContact_partnerId_idx" ON "GovConPartnerContact"("partnerId");

-- CreateIndex
CREATE INDEX "GovConOpportunity_hubOrganizationId_idx" ON "GovConOpportunity"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConOpportunity_hubOrganizationId_stage_idx" ON "GovConOpportunity"("hubOrganizationId", "stage");

-- CreateIndex
CREATE INDEX "GovConOpportunity_hubOrganizationId_health_idx" ON "GovConOpportunity"("hubOrganizationId", "health");

-- CreateIndex
CREATE INDEX "GovConOpportunity_hubOrganizationId_agencyId_idx" ON "GovConOpportunity"("hubOrganizationId", "agencyId");

-- CreateIndex
CREATE INDEX "GovConOpportunity_hubOrganizationId_proposalDeadline_idx" ON "GovConOpportunity"("hubOrganizationId", "proposalDeadline");

-- CreateIndex
CREATE INDEX "GovConOpportunity_hubOrganizationId_archivedAt_idx" ON "GovConOpportunity"("hubOrganizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "GovConOpportunityStageHistory_hubOrganizationId_idx" ON "GovConOpportunityStageHistory"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConOpportunityStageHistory_opportunityId_idx" ON "GovConOpportunityStageHistory"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConMilestone_hubOrganizationId_idx" ON "GovConMilestone"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConMilestone_opportunityId_idx" ON "GovConMilestone"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConMilestone_hubOrganizationId_dueAt_idx" ON "GovConMilestone"("hubOrganizationId", "dueAt");

-- CreateIndex
CREATE INDEX "GovConMilestone_hubOrganizationId_status_idx" ON "GovConMilestone"("hubOrganizationId", "status");

-- CreateIndex
CREATE INDEX "GovConOpportunityPartner_hubOrganizationId_idx" ON "GovConOpportunityPartner"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConOpportunityPartner_partnerId_idx" ON "GovConOpportunityPartner"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConOpportunityPartner_opportunityId_partnerId_key" ON "GovConOpportunityPartner"("opportunityId", "partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConCapturePlan_opportunityId_key" ON "GovConCapturePlan"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConCapturePlan_hubOrganizationId_idx" ON "GovConCapturePlan"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConCaptureSection_hubOrganizationId_idx" ON "GovConCaptureSection"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConCaptureSection_capturePlanId_idx" ON "GovConCaptureSection"("capturePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConBidDecision_opportunityId_key" ON "GovConBidDecision"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConBidDecision_hubOrganizationId_idx" ON "GovConBidDecision"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConBidDecisionReview_hubOrganizationId_idx" ON "GovConBidDecisionReview"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConBidDecisionReview_bidDecisionId_reviewerId_key" ON "GovConBidDecisionReview"("bidDecisionId", "reviewerId");

-- CreateIndex
CREATE INDEX "GovConProposal_hubOrganizationId_idx" ON "GovConProposal"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConProposal_opportunityId_idx" ON "GovConProposal"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConProposalVolume_hubOrganizationId_idx" ON "GovConProposalVolume"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConProposalVolume_proposalId_idx" ON "GovConProposalVolume"("proposalId");

-- CreateIndex
CREATE INDEX "GovConRequirement_hubOrganizationId_idx" ON "GovConRequirement"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConRequirement_opportunityId_idx" ON "GovConRequirement"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConRequirement_proposalId_idx" ON "GovConRequirement"("proposalId");

-- CreateIndex
CREATE INDEX "GovConRequirement_hubOrganizationId_status_idx" ON "GovConRequirement"("hubOrganizationId", "status");

-- CreateIndex
CREATE INDEX "GovConReview_hubOrganizationId_idx" ON "GovConReview"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConReview_opportunityId_idx" ON "GovConReview"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConReviewFinding_hubOrganizationId_idx" ON "GovConReviewFinding"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConReviewFinding_reviewId_idx" ON "GovConReviewFinding"("reviewId");

-- CreateIndex
CREATE INDEX "GovConTask_hubOrganizationId_idx" ON "GovConTask"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConTask_opportunityId_idx" ON "GovConTask"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConTask_hubOrganizationId_status_idx" ON "GovConTask"("hubOrganizationId", "status");

-- CreateIndex
CREATE INDEX "GovConTask_hubOrganizationId_assigneeId_idx" ON "GovConTask"("hubOrganizationId", "assigneeId");

-- CreateIndex
CREATE INDEX "GovConTask_hubOrganizationId_dueAt_idx" ON "GovConTask"("hubOrganizationId", "dueAt");

-- CreateIndex
CREATE INDEX "GovConTaskDependency_hubOrganizationId_idx" ON "GovConTaskDependency"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConTaskDependency_taskId_dependsOnTaskId_key" ON "GovConTaskDependency"("taskId", "dependsOnTaskId");

-- CreateIndex
CREATE INDEX "GovConComment_hubOrganizationId_idx" ON "GovConComment"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConComment_opportunityId_idx" ON "GovConComment"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConComment_taskId_idx" ON "GovConComment"("taskId");

-- CreateIndex
CREATE INDEX "GovConComment_entityType_entityId_idx" ON "GovConComment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "GovConMention_hubOrganizationId_idx" ON "GovConMention"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConMention_mentionedUserId_idx" ON "GovConMention"("mentionedUserId");

-- CreateIndex
CREATE INDEX "GovConMention_commentId_idx" ON "GovConMention"("commentId");

-- CreateIndex
CREATE INDEX "GovConNotification_hubOrganizationId_idx" ON "GovConNotification"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConNotification_hubOrganizationId_recipientId_readAt_idx" ON "GovConNotification"("hubOrganizationId", "recipientId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovConSbirTopic_opportunityId_key" ON "GovConSbirTopic"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConSbirTopic_hubOrganizationId_idx" ON "GovConSbirTopic"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConSbirTopic_hubOrganizationId_closeDate_idx" ON "GovConSbirTopic"("hubOrganizationId", "closeDate");

-- CreateIndex
CREATE UNIQUE INDEX "GovConSbirAssessment_sbirTopicId_key" ON "GovConSbirAssessment"("sbirTopicId");

-- CreateIndex
CREATE INDEX "GovConSbirAssessment_hubOrganizationId_idx" ON "GovConSbirAssessment"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConDocument_hubOrganizationId_idx" ON "GovConDocument"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConDocument_opportunityId_idx" ON "GovConDocument"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConDocument_partnerId_idx" ON "GovConDocument"("partnerId");

-- CreateIndex
CREATE INDEX "GovConDocument_hubOrganizationId_category_idx" ON "GovConDocument"("hubOrganizationId", "category");

-- CreateIndex
CREATE INDEX "GovConReadinessItem_hubOrganizationId_idx" ON "GovConReadinessItem"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConReadinessItem_hubOrganizationId_status_idx" ON "GovConReadinessItem"("hubOrganizationId", "status");

-- CreateIndex
CREATE INDEX "GovConReadinessItem_hubOrganizationId_expirationDate_idx" ON "GovConReadinessItem"("hubOrganizationId", "expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "GovConReadinessItem_hubOrganizationId_name_key" ON "GovConReadinessItem"("hubOrganizationId", "name");

-- CreateIndex
CREATE INDEX "GovConRisk_hubOrganizationId_idx" ON "GovConRisk"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConRisk_opportunityId_idx" ON "GovConRisk"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConSubmission_opportunityId_key" ON "GovConSubmission"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConSubmission_hubOrganizationId_idx" ON "GovConSubmission"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConOutcome_opportunityId_key" ON "GovConOutcome"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConOutcome_hubOrganizationId_idx" ON "GovConOutcome"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConSavedView_hubOrganizationId_idx" ON "GovConSavedView"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConSavedView_hubOrganizationId_entity_idx" ON "GovConSavedView"("hubOrganizationId", "entity");

-- CreateIndex
CREATE INDEX "GovConTag_hubOrganizationId_idx" ON "GovConTag"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConTag_hubOrganizationId_name_key" ON "GovConTag"("hubOrganizationId", "name");

-- CreateIndex
CREATE INDEX "GovConTagOnOpportunity_hubOrganizationId_idx" ON "GovConTagOnOpportunity"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConTagOnOpportunity_opportunityId_idx" ON "GovConTagOnOpportunity"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConActivityEvent_hubOrganizationId_idx" ON "GovConActivityEvent"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConActivityEvent_hubOrganizationId_createdAt_idx" ON "GovConActivityEvent"("hubOrganizationId", "createdAt");

-- CreateIndex
CREATE INDEX "GovConActivityEvent_opportunityId_idx" ON "GovConActivityEvent"("opportunityId");

-- CreateIndex
CREATE INDEX "GovConActivityEvent_entityType_entityId_idx" ON "GovConActivityEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "GovConAgency" ADD CONSTRAINT "GovConAgency_parentAgencyId_fkey" FOREIGN KEY ("parentAgencyId") REFERENCES "GovConAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOffice" ADD CONSTRAINT "GovConOffice_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "GovConAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConContact" ADD CONSTRAINT "GovConContact_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "GovConAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConContact" ADD CONSTRAINT "GovConContact_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "GovConOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConInteraction" ADD CONSTRAINT "GovConInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "GovConContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConInteraction" ADD CONSTRAINT "GovConInteraction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConPartnerContact" ADD CONSTRAINT "GovConPartnerContact_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "GovConPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOpportunity" ADD CONSTRAINT "GovConOpportunity_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "GovConAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOpportunity" ADD CONSTRAINT "GovConOpportunity_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "GovConOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOpportunity" ADD CONSTRAINT "GovConOpportunity_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "GovConContractVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOpportunityStageHistory" ADD CONSTRAINT "GovConOpportunityStageHistory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConMilestone" ADD CONSTRAINT "GovConMilestone_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOpportunityPartner" ADD CONSTRAINT "GovConOpportunityPartner_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOpportunityPartner" ADD CONSTRAINT "GovConOpportunityPartner_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "GovConPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConCapturePlan" ADD CONSTRAINT "GovConCapturePlan_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConCaptureSection" ADD CONSTRAINT "GovConCaptureSection_capturePlanId_fkey" FOREIGN KEY ("capturePlanId") REFERENCES "GovConCapturePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConBidDecision" ADD CONSTRAINT "GovConBidDecision_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConBidDecisionReview" ADD CONSTRAINT "GovConBidDecisionReview_bidDecisionId_fkey" FOREIGN KEY ("bidDecisionId") REFERENCES "GovConBidDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConProposal" ADD CONSTRAINT "GovConProposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConProposalVolume" ADD CONSTRAINT "GovConProposalVolume_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GovConProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConRequirement" ADD CONSTRAINT "GovConRequirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConRequirement" ADD CONSTRAINT "GovConRequirement_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GovConProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConRequirement" ADD CONSTRAINT "GovConRequirement_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "GovConProposalVolume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConReview" ADD CONSTRAINT "GovConReview_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConReview" ADD CONSTRAINT "GovConReview_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GovConProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConReviewFinding" ADD CONSTRAINT "GovConReviewFinding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "GovConReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConTask" ADD CONSTRAINT "GovConTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConTask" ADD CONSTRAINT "GovConTask_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GovConProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConTaskDependency" ADD CONSTRAINT "GovConTaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GovConTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConTaskDependency" ADD CONSTRAINT "GovConTaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "GovConTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConComment" ADD CONSTRAINT "GovConComment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConComment" ADD CONSTRAINT "GovConComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GovConTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConComment" ADD CONSTRAINT "GovConComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "GovConComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConMention" ADD CONSTRAINT "GovConMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "GovConComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConSbirTopic" ADD CONSTRAINT "GovConSbirTopic_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "GovConAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConSbirTopic" ADD CONSTRAINT "GovConSbirTopic_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConSbirAssessment" ADD CONSTRAINT "GovConSbirAssessment_sbirTopicId_fkey" FOREIGN KEY ("sbirTopicId") REFERENCES "GovConSbirTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConDocument" ADD CONSTRAINT "GovConDocument_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConDocument" ADD CONSTRAINT "GovConDocument_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "GovConPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConRisk" ADD CONSTRAINT "GovConRisk_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConSubmission" ADD CONSTRAINT "GovConSubmission_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConOutcome" ADD CONSTRAINT "GovConOutcome_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConTagOnOpportunity" ADD CONSTRAINT "GovConTagOnOpportunity_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "GovConTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConTagOnOpportunity" ADD CONSTRAINT "GovConTagOnOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConActivityEvent" ADD CONSTRAINT "GovConActivityEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GovConOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
