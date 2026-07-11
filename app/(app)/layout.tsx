import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { countUnread } from "@/lib/services/notifications";

/**
 * Authenticated workspace layout. Resolves the GovCon context (redirects to
 * sign-in / choose-organization / access-denied as needed) and renders the app
 * shell around every workspace route.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireGovConContext();
  const unread = await countUnread(ctx);
  return <AppShell unreadNotifications={unread}>{children}</AppShell>;
}
