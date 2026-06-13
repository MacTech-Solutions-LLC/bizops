"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useAuth,
  useClerk,
  useOrganization,
  useOrganizationList,
} from "@clerk/nextjs";

const SKIP_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/choose-organization",
  "/access-denied",
];

/** Silently activates the user's first Clerk org when signed in without an active org. */
export function ClerkOrgBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userMemberships, isLoaded: listLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const selectingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    if (!orgLoaded || !listLoaded) return;
    if (organization || selectingRef.current) return;

    const memberships = userMemberships?.data ?? [];
    if (memberships.length === 0) return;

    selectingRef.current = true;
    const first = memberships[0].organization;
    void setActive({ organization: first.id })
      .then(() => router.refresh())
      .finally(() => {
        selectingRef.current = false;
      });
  }, [
    isLoaded,
    isSignedIn,
    orgLoaded,
    listLoaded,
    organization,
    userMemberships,
    pathname,
    setActive,
    router,
  ]);

  return null;
}
