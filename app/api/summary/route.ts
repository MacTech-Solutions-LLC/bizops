import { NextResponse } from "next/server";
import { getAppAuthContext } from "@/lib/auth/context";
import { getCompanyProfile, listCampaigns, listTeam } from "@/lib/domain/store";

export async function GET() {
  const ctx = await getAppAuthContext();
  if (!ctx) return NextResponse.json({ error: "hub_auth_required" }, { status: 403 });
  try {
    const orgId = ctx.hub.tenant.organizationId;
    return NextResponse.json({
      company: getCompanyProfile(orgId),
      team: listTeam(orgId),
      campaigns: listCampaigns(orgId),
    });
  } catch (err) {
    console.error("[api/summary] GET failed:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
