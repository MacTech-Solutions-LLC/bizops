import { NextResponse } from "next/server";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public build-info endpoint — mirrors the MacTech Suite build-info standard so
 * Command Center can correlate a running deploy with a commit. Populated from
 * Railway-injected env vars; falls back to nulls in local dev.
 */
export async function GET() {
  const commitSha = process.env.RAILWAY_GIT_COMMIT_SHA ?? null;
  return NextResponse.json({
    service: "bizops",
    appKey: "bizops",
    version: pkg.version,
    environment: process.env.NODE_ENV ?? "development",
    repo:
      process.env.RAILWAY_GIT_REPO_OWNER && process.env.RAILWAY_GIT_REPO_NAME
        ? `${process.env.RAILWAY_GIT_REPO_OWNER}/${process.env.RAILWAY_GIT_REPO_NAME}`
        : "MacTech-Solutions-LLC/bizops",
    branch: process.env.RAILWAY_GIT_BRANCH ?? null,
    commitSha,
    commitShortSha: commitSha ? commitSha.slice(0, 7) : null,
    railwayServiceId: process.env.RAILWAY_SERVICE_ID ?? null,
    railwayProjectId: process.env.RAILWAY_PROJECT_ID ?? null,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
    status: "ok",
  });
}
