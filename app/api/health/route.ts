import { NextResponse } from "next/server";
import { APP_KEY, getHubAuthorityMode } from "@/lib/hub/client";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    appKey: APP_KEY,
    hubMode: getHubAuthorityMode(),
  });
}
