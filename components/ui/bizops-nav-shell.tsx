"use client";

import { UserButton } from "@clerk/nextjs";
import { Building2, Home, Megaphone, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SidebarNav } from "./sidebar-nav";

const AUTH_FREE_PREFIXES = ["/sign-in", "/sign-up", "/access-denied"];

interface BizOpsNavShellProps {
  children: ReactNode;
}

export function BizOpsNavShell({ children }: BizOpsNavShellProps) {
  const pathname = usePathname();

  if (AUTH_FREE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        overflow: "hidden",
        background: "var(--mt-bg)",
      }}
    >
      <SidebarNav
        brand="BizOps"
        activeHref={pathname}
        sections={[
          {
            heading: "Business",
            items: [
              {
                label: "Company Profile",
                href: "/company",
                icon: <Building2 size={16} />,
              },
              {
                label: "Team",
                href: "/team",
                icon: <Users size={16} />,
              },
              {
                label: "Campaigns",
                href: "/campaigns",
                icon: <Megaphone size={16} />,
              },
            ],
          },
          {
            heading: "Account",
            items: [{ label: "Home", href: "/", icon: <Home size={16} /> }],
          },
        ]}
        footer={<UserButton afterSignOutUrl="/sign-in" />}
      />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
