-- CreateTable
CREATE TABLE "GovConCapabilityStatement" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "hubUserId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "GovConProfileStatus" NOT NULL DEFAULT 'draft',
    "professionalSummary" TEXT,
    "coreCompetencies" TEXT[],
    "differentiators" TEXT[],
    "pastPerformanceHighlights" TEXT[],
    "generatedAt" TIMESTAMP(3),
    "generateModel" TEXT,
    "hubSyncedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConCapabilityStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GovConCapabilityStatement_profileId_key" ON "GovConCapabilityStatement"("profileId");

-- CreateIndex
CREATE INDEX "GovConCapabilityStatement_hubOrganizationId_idx" ON "GovConCapabilityStatement"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovConCapabilityStatement_hubOrganizationId_hubUserId_key" ON "GovConCapabilityStatement"("hubOrganizationId", "hubUserId");

-- AddForeignKey
ALTER TABLE "GovConCapabilityStatement" ADD CONSTRAINT "GovConCapabilityStatement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GovConMemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
