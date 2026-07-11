import { NextResponse } from "next/server";
import { getGovConContext } from "@/lib/auth/govcon-context";
import { search } from "@/lib/services/search";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Tenant-safe global search for the command palette / search bar. */
export async function GET(request: Request) {
  const ctx = await getGovConContext();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized", results: [] }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const results = await search(ctx, q);
    return NextResponse.json({ results });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json({ ...appErr.toResponseBody(), results: [] }, { status: appErr.status });
  }
}
