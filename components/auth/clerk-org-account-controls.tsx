"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export function ClerkOrgAccountControls({
  afterSignOutUrl = "/sign-in",
}: {
  afterSignOutUrl?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <OrganizationSwitcher
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterLeaveOrganizationUrl="/choose-organization"
        afterSelectOrganizationUrl="/"
        appearance={{
          elements: {
            rootBox: "w-full",
            organizationSwitcherTrigger:
              "w-full justify-between text-xs px-2 py-1.5 rounded border border-[var(--mt-hairline,#e2e8f0)]",
          },
        }}
      />
      <UserButton afterSignOutUrl={afterSignOutUrl} />
    </div>
  );
}
