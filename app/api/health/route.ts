import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import pkg from "@/package.json";

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
    ok: true,
    app: "bizops",
    version: pkg.version,
    prismaConnected,
  });
}
