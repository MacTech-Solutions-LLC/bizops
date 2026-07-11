import { NextResponse } from "next/server";
import { getGovConContext } from "@/lib/auth/govcon-context";
import { getDashboardData } from "@/lib/services/opportunities";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Authenticated JSON summary of the tenant's pipeline (KPIs). Returns 403
 * `hub_auth_required` when there is no resolved GovCon context — the guard the
 * dev smoke test asserts.
 */
export async function GET() {
  const ctx = await getGovConContext();
  if (!ctx) return NextResponse.json({ error: "hub_auth_required" }, { status: 403 });
  try {
    const dashboard = await getDashboardData(ctx);
    return NextResponse.json({
      appKey: "bizops",
      organizationId: ctx.tenantOrgId,
      kpis: dashboard.kpis,
    });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(appErr.toResponseBody(), { status: appErr.status });
  }
}
