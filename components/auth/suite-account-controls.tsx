"use client";

import { useEffect, useState } from "react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import type { SuiteOrgContextUx } from "@/lib/auth/org-context-policy";

export function SuiteAccountControls({
  afterSignOutUrl = "/sign-in",
}: {
  afterSignOutUrl?: string;
}) {
  const [orgContext, setOrgContext] = useState<SuiteOrgContextUx | null>(null);

  useEffect(() => {
    void fetch("/api/auth/org-context")
      .then((response) => response.json())
      .then((data) => setOrgContext(data?.orgContext ?? null))
      .catch(() => setOrgContext(null));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {orgContext?.showOrgSwitcher ? (
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
      ) : null}
      <UserButton afterSignOutUrl={afterSignOutUrl} />
    </div>
  );
}
