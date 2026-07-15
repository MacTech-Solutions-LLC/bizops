-- CreateEnum
CREATE TYPE "GovConProfileStatus" AS ENUM ('draft', 'in_review', 'published');

-- CreateEnum
CREATE TYPE "GovConClearanceLevel" AS ENUM ('none', 'public_trust', 'confidential', 'secret', 'top_secret', 'ts_sci');

-- CreateEnum
CREATE TYPE "GovConProficiency" AS ENUM ('familiar', 'proficient', 'expert');

-- CreateEnum
CREATE TYPE "GovConFieldSource" AS ENUM ('manual', 'heuristic', 'ai');

-- CreateTable
CREATE TABLE "GovConMemberProfile" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "hubUserId" TEXT NOT NULL,
    "status" "GovConProfileStatus" NOT NULL DEFAULT 'draft',
    "headline" TEXT,
    "summary" TEXT,
    "laborCategory" TEXT,
    "yearsExperience" INTEGER,
    "clearanceLevel" "GovConClearanceLevel" NOT NULL DEFAULT 'none',
    "clearanceGrantedOn" TIMESTAMP(3),
    "investigationType" TEXT,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "resumeParsedAt" TIMESTAMP(3),
    "resumeSourceFilename" TEXT,
    "resumeParseModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConMemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConMemberSkill" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "proficiency" "GovConProficiency" NOT NULL DEFAULT 'proficient',
    "yearsExperience" INTEGER,
    "source" "GovConFieldSource" NOT NULL DEFAULT 'manual',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConMemberSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConMemberCertification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "identifier" TEXT,
    "issuedOn" TIMESTAMP(3),
    "expiresOn" TIMESTAMP(3),
    "source" "GovConFieldSource" NOT NULL DEFAULT 'manual',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConMemberCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConMemberEducation" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "completedOn" TIMESTAMP(3),
    "source" "GovConFieldSource" NOT NULL DEFAULT 'manual',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConMemberEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovConMemberExperience" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT,
    "startedOn" TIMESTAMP(3),
    "endedOn" TIMESTAMP(3),
    "summary" TEXT,
    "isFederal" BOOLEAN NOT NULL DEFAULT false,
    "agency" TEXT,
    "contractName" TEXT,
    "source" "GovConFieldSource" NOT NULL DEFAULT 'manual',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovConMemberExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovConMemberProfile_hubOrganizationId_idx" ON "GovConMemberProfile"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "GovConMemberProfile_hubOrganizationId_status_idx" ON "GovConMemberProfile"("hubOrganizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GovConMemberProfile_hubOrganizationId_hubUserId_key" ON "GovConMemberProfile"("hubOrganizationId", "hubUserId");

-- CreateIndex
CREATE INDEX "GovConMemberSkill_profileId_idx" ON "GovConMemberSkill"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConMemberSkill_profileId_name_key" ON "GovConMemberSkill"("profileId", "name");

-- CreateIndex
CREATE INDEX "GovConMemberCertification_profileId_idx" ON "GovConMemberCertification"("profileId");

-- CreateIndex
CREATE INDEX "GovConMemberCertification_profileId_expiresOn_idx" ON "GovConMemberCertification"("profileId", "expiresOn");

-- CreateIndex
CREATE INDEX "GovConMemberEducation_profileId_idx" ON "GovConMemberEducation"("profileId");

-- CreateIndex
CREATE INDEX "GovConMemberExperience_profileId_idx" ON "GovConMemberExperience"("profileId");

-- CreateIndex
CREATE INDEX "GovConMemberExperience_profileId_isFederal_idx" ON "GovConMemberExperience"("profileId", "isFederal");

-- AddForeignKey
ALTER TABLE "GovConMemberSkill" ADD CONSTRAINT "GovConMemberSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GovConMemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConMemberCertification" ADD CONSTRAINT "GovConMemberCertification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GovConMemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConMemberEducation" ADD CONSTRAINT "GovConMemberEducation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GovConMemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovConMemberExperience" ADD CONSTRAINT "GovConMemberExperience_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GovConMemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
