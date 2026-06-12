import { NextResponse } from "next/server";
import { APP_KEY, getHubAuthorityMode } from "@/lib/hub/client";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public liveness probe — no auth, no secrets. */
export async function GET() {
  let prismaConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaConnected = true;
  } catch {
    prismaConnected = false;
  }

  return NextResponse.json({
    status: "ok",
    appKey: APP_KEY,
    hubMode: getHubAuthorityMode(),
    prismaConnected,
    mode: prismaConnected ? "live" : "stub",
  });
}
