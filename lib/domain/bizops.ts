import type { Campaign, CompanyProfile, TeamMember } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type { Campaign, CompanyProfile, TeamMember };

export async function getCompanyProfile(
  hubOrgId: string,
): Promise<CompanyProfile | null> {
  try {
    return await prisma.companyProfile.findUnique({
      where: { hubOrganizationId: hubOrgId },
    });
  } catch {
    return null;
  }
}

export async function listTeam(hubOrgId: string): Promise<TeamMember[]> {
  try {
    return await prisma.teamMember.findMany({
      where: { hubOrganizationId: hubOrgId },
      orderBy: { displayName: "asc" },
    });
  } catch {
    return [];
  }
}

export async function listCampaigns(hubOrgId: string): Promise<Campaign[]> {
  try {
    return await prisma.campaign.findMany({
      where: { hubOrganizationId: hubOrgId },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}
