-- CreateTable
CREATE TABLE "GovConCompanyCapabilityStatement" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "professionalSummary" TEXT,
    "coreCompetencies" TEXT[],
    "differentiators" TEXT[],
    "pastPerformanceHighlights" TEXT[],
    "generatedAt" TIMESTAMP(3),
    "generateModel" TEXT,
    "sourceHubUserIds" TEXT[],
    "confirmedAt" TIMESTAMP(3),
    "confirmedByHubUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovConCompanyCapabilityStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GovConCompanyCapabilityStatement_hubOrganizationId_key" ON "GovConCompanyCapabilityStatement"("hubOrganizationId");
