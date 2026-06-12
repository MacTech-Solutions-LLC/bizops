-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "dba" TEXT,
    "cageCode" TEXT,
    "uei" TEXT,
    "naicsPrimary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "hubUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "title" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "leadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_hubOrganizationId_key" ON "CompanyProfile"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "TeamMember_hubOrganizationId_idx" ON "TeamMember"("hubOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_hubOrganizationId_hubUserId_key" ON "TeamMember"("hubOrganizationId", "hubUserId");

-- CreateIndex
CREATE INDEX "Campaign_hubOrganizationId_idx" ON "Campaign"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "Campaign_hubOrganizationId_status_idx" ON "Campaign"("hubOrganizationId", "status");
