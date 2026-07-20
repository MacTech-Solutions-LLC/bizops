import { NextResponse } from "next/server";
import { directoryServiceContext, requireDirectoryServiceCaller } from "@/lib/service-auth";
import { createDirectoryContact, listDirectoryContacts } from "@/lib/services/directory";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cross-app Directory contacts API (service-token auth — see lib/service-auth).
 *
 * GET  /api/directory/contacts?organizationId=…&q=&kind=&status=&tag=&directoryOrganizationId=…
 * POST /api/directory/contacts  body: { organizationId, name, ...fields }
 *
 * `organizationId` is the Hub tenant; `directoryOrganizationId` filters by a
 * DirectoryOrganization record.
 */
export async function GET(request: Request) {
  try {
    const { sourceApp } = requireDirectoryServiceCaller(request);
    const url = new URL(request.url);
    const ctx = directoryServiceContext(sourceApp, url.searchParams.get("organizationId"));
    const filter = Object.fromEntries(
      ["q", "kind", "status", "tag", "sortBy", "sortDir"]
        .map((k) => [k, url.searchParams.get(k) ?? undefined])
        .filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    const dirOrgId = url.searchParams.get("directoryOrganizationId");
    if (dirOrgId) filter.organizationId = dirOrgId;
    const contacts = await listDirectoryContacts(ctx, filter);
    return NextResponse.json({ appKey: "bizops", organizationId: ctx.tenantOrgId, contacts });
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
    const contact = await createDirectoryContact(ctx, body);
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(appErr.toResponseBody(), { status: appErr.status });
  }
}
