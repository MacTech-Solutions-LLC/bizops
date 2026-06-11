/** In-memory domain stubs — no identity SoT. Hub IDs only at API boundary. */

export type CompanyProfile = {
  hubOrganizationId: string;
  legalName: string;
  dba?: string;
  cageCode?: string;
};

export type TeamMember = {
  id: string;
  hubUserId: string;
  displayName: string;
  role: string;
};

export type Campaign = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused";
  leadCount: number;
};

const profiles = new Map<string, CompanyProfile>();
const team = new Map<string, TeamMember[]>();
const campaigns = new Map<string, Campaign[]>();

export function getCompanyProfile(hubOrganizationId: string): CompanyProfile {
  if (!profiles.has(hubOrganizationId)) {
    profiles.set(hubOrganizationId, {
      hubOrganizationId,
      legalName: "Acme Dev Org (stub)",
      dba: "Acme",
      cageCode: "DEV01",
    });
  }
  return profiles.get(hubOrganizationId)!;
}

export function listTeam(hubOrganizationId: string): TeamMember[] {
  if (!team.has(hubOrganizationId)) {
    team.set(hubOrganizationId, [
      { id: "1", hubUserId: "hub_user_admin", displayName: "Dev Admin", role: "owner" },
      { id: "2", hubUserId: "hub_user_member", displayName: "Dev Member", role: "member" },
    ]);
  }
  return team.get(hubOrganizationId)!;
}

export function listCampaigns(hubOrganizationId: string): Campaign[] {
  if (!campaigns.has(hubOrganizationId)) {
    campaigns.set(hubOrganizationId, [
      { id: "c1", name: "Q3 Pipeline", status: "active", leadCount: 12 },
      { id: "c2", name: "Partner Outreach", status: "draft", leadCount: 0 },
    ]);
  }
  return campaigns.get(hubOrganizationId)!;
}
