"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { ACTIVE_ORG_COOKIE } from "@/lib/auth/active-org";

/**
 * Record the selected organization server-side and continue to the dashboard.
 *
 * Clerk's client-side `setActive` does not reliably propagate the active org
 * into the server-read session cookie in time for the next navigation (App
 * Router SSR race), which left operators stuck on /choose-organization. Setting
 * the org in a cookie the server reads immediately makes selection deterministic.
 * This only *selects* among orgs — the Hub still enforces membership on resolve,
 * so a user cannot reach an org they are not a member of.
 */
export async function selectOrganizationAction(clerkOrgId: string): Promise<void> {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!clerkOrgId || !clerkOrgId.startsWith("org_")) redirect("/choose-organization");

  cookies().set(ACTIVE_ORG_COOKIE, clerkOrgId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}

/** Clear the selected org (e.g. to switch). */
export async function clearOrganizationAction(): Promise<void> {
  cookies().delete(ACTIVE_ORG_COOKIE);
  redirect("/choose-organization");
}
