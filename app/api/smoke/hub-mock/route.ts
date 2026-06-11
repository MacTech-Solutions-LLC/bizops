import { NextResponse } from "next/server";
import { getHubAuthorityMode } from "@/lib/hub/client";
import { runMockHubSmoke } from "@/lib/hub/smoke";

export const dynamic = "force-dynamic";

export async function GET() {
  const hubMode = getHubAuthorityMode();
  if (hubMode !== "mock") {
    return NextResponse.json({
      status: "skipped",
      hubMode,
      reason: "hub_mock_smoke_requires_mock_mode",
    });
  }

  try {
    const result = await runMockHubSmoke();
    return NextResponse.json({ status: "ok", hubMode, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        hubMode,
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
