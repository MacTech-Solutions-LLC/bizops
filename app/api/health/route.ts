import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getHubAuthorityMode } from "@/lib/hub/client";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public health probe — no auth, no secrets. Shape follows the MacTech Suite
 * health standard consumed by Command Center's ecosystem-health classifier:
 *   { status: "ok" | "degraded", appKey, hubMode, database, version, latencyMs }
 * `status` is "ok" when the database round-trips, otherwise "degraded" (503).
 */
export async function GET() {
  const startedAt = Date.now();
  let database: "ok" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch {
    database = "down";
  }

  const healthy = database === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      appKey: "bizops",
      hubMode: getHubAuthorityMode(),
      database,
      version: pkg.version,
      latencyMs: Date.now() - startedAt,
    },
    { status: healthy ? 200 : 503 },
  );
}
