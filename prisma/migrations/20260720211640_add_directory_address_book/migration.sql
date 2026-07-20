-- CreateEnum
CREATE TYPE "DirectoryOrgType" AS ENUM ('INTERNAL', 'GOVERNMENT', 'PRIME', 'SUBCONTRACTOR', 'TEAMING_PARTNER', 'VENDOR', 'CONSULTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "DirectoryContactKind" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "DirectoryEntryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "DirectoryOrganization" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgType" "DirectoryOrgType" NOT NULL DEFAULT 'OTHER',
    "abbreviation" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "uei" TEXT,
    "cageCode" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "status" "DirectoryEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceApp" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "DirectoryOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryContact" (
    "id" TEXT NOT NULL,
    "hubOrganizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DirectoryContactKind" NOT NULL DEFAULT 'EXTERNAL',
    "title" TEXT,
    "department" TEXT,
    "organizationId" TEXT,
    "organizationName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "linkedinUrl" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "status" "DirectoryEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceApp" TEXT,
    "hubUserId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "DirectoryContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectoryOrganization_hubOrganizationId_idx" ON "DirectoryOrganization"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "DirectoryOrganization_hubOrganizationId_orgType_idx" ON "DirectoryOrganization"("hubOrganizationId", "orgType");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryOrganization_hubOrganizationId_name_key" ON "DirectoryOrganization"("hubOrganizationId", "name");

-- CreateIndex
CREATE INDEX "DirectoryContact_hubOrganizationId_idx" ON "DirectoryContact"("hubOrganizationId");

-- CreateIndex
CREATE INDEX "DirectoryContact_organizationId_idx" ON "DirectoryContact"("organizationId");

-- CreateIndex
CREATE INDEX "DirectoryContact_hubOrganizationId_kind_idx" ON "DirectoryContact"("hubOrganizationId", "kind");

-- CreateIndex
CREATE INDEX "DirectoryContact_hubOrganizationId_email_idx" ON "DirectoryContact"("hubOrganizationId", "email");

-- AddForeignKey
ALTER TABLE "DirectoryContact" ADD CONSTRAINT "DirectoryContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "DirectoryOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
