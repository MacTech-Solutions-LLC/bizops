import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Application shell — dark-navy sidebar (desktop) + sticky topbar + scrollable
 * workspace. The sidebar is hidden on mobile and available via the topbar menu.
 */
export function AppShell({
  children,
  unreadNotifications = 0,
}: {
  children: ReactNode;
  unreadNotifications?: number;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar unreadNotifications={unreadNotifications} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
