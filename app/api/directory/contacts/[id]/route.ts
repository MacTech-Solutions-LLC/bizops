import { NextResponse } from "next/server";
import { directoryServiceContext, requireDirectoryServiceCaller } from "@/lib/service-auth";
import { getDirectoryContact, updateDirectoryContact } from "@/lib/services/directory";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET   /api/directory/contacts/:id?organizationId=…
 * PATCH /api/directory/contacts/:id  body: { organizationId, ...fields }
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { sourceApp } = requireDirectoryServiceCaller(request);
    const url = new URL(request.url);
    const ctx = directoryServiceContext(sourceApp, url.searchParams.get("organizationId"));
    const contact = await getDirectoryContact(ctx, params.id);
    return NextResponse.json({ contact });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(appErr.toResponseBody(), { status: appErr.status });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { sourceApp } = requireDirectoryServiceCaller(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ctx = directoryServiceContext(sourceApp, body.organizationId);
    delete body.organizationId;
    const contact = await updateDirectoryContact(ctx, params.id, body);
    return NextResponse.json({ contact });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(appErr.toResponseBody(), { status: appErr.status });
  }
}
