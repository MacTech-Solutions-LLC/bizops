import { NextResponse } from "next/server";
import { resolveOrgContextForSession } from "@/lib/auth/org-context-server";
import { resolveAppHubAccess } from "@/lib/hub/client";

export async function GET() {
  const resolved = await resolveOrgContextForSession(resolveAppHubAccess);
  if (!resolved) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({
    hubAllowed: resolved.hub.allowed,
    orgContext: resolved.orgContext,
    organizationId: resolved.hub.tenant?.organizationId ?? null,
    role: resolved.hub.membership?.role ?? null,
  });
}
