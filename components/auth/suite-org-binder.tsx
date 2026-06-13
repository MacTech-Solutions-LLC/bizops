"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useClerk, useOrganization } from "@clerk/nextjs";

const SKIP_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/access-denied",
  "/choose-organization",
];

/** Silent Clerk org bind for tenants; operator redirect to choose-org (DR-2026-06-13-01). */
export function SuiteOrgBinder() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const bindingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !orgLoaded) return;
    if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    if (organization || bindingRef.current) return;

    bindingRef.current = true;
    void fetch("/api/auth/org-context")
      .then((response) => response.json())
      .then((data) => {
        const ctx = data?.orgContext;
        if (!ctx) return;
        if (ctx.mode === "tenant_bound" && ctx.boundClerkOrgId) {
          return setActive({ organization: ctx.boundClerkOrgId }).then(() => router.refresh());
        }
        if (ctx.showChooseOrganization) {
          router.replace("/choose-organization");
        }
      })
      .finally(() => {
        bindingRef.current = false;
      });
  }, [isLoaded, isSignedIn, orgLoaded, organization, pathname, setActive, router]);

  return null;
}
