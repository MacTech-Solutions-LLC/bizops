import { NextResponse } from "next/server";
import { directoryServiceContext, requireDirectoryServiceCaller } from "@/lib/service-auth";
import { createDirectoryOrganization, listDirectoryOrganizations } from "@/lib/services/directory";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET  /api/directory/organizations?organizationId=…&q=&orgType=&status=
 * POST /api/directory/organizations  body: { organizationId, name, ...fields }
 *
 * `organizationId` is always the Hub tenant; the directory organization being
 * created/listed is the payload.
 */
export async function GET(request: Request) {
  try {
    const { sourceApp } = requireDirectoryServiceCaller(request);
    const url = new URL(request.url);
    const ctx = directoryServiceContext(sourceApp, url.searchParams.get("organizationId"));
    const filter = Object.fromEntries(
      ["q", "orgType", "status", "sortBy", "sortDir"]
        .map((k) => [k, url.searchParams.get(k) ?? undefined])
        .filter(([, v]) => v !== undefined),
    );
    const organizations = await listDirectoryOrganizations(ctx, filter);
    return NextResponse.json({ appKey: "bizops", organizationId: ctx.tenantOrgId, organizations });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(appErr.toResponseBody(), { status: appErr.status });
  }
}

export async function POST(request: Request) {
  try {
    const { sourceApp } = requireDirectoryServiceCaller(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ctx = directoryServiceContext(sourceApp, body.organizationId);
    delete body.organizationId;
    const organization = await createDirectoryOrganization(ctx, body);
    return NextResponse.json({ organization }, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(appErr.toResponseBody(), { status: appErr.status });
  }
}
