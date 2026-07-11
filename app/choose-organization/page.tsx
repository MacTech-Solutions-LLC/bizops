import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { orgContextFromHubSnapshot } from "@/lib/auth/org-context-server";
import { resolveAppHubAccess } from "@/lib/hub/client";
import { OrgPicker } from "@/components/auth/org-picker";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/active-org";

export const dynamic = "force-dynamic";

export default async function ChooseOrganizationPage() {
  const { userId, orgId } = auth();
  if (!userId) redirect("/sign-in");
  // Already have an active org (Clerk session or the server selection cookie) →
  // go to the workspace.
  if (orgId || cookies().get(ACTIVE_ORG_COOKIE)?.value) redirect("/dashboard");

  const hub = await resolveAppHubAccess(userId, null);
  const orgContext = orgContextFromHubSnapshot(hub, orgId);
  if (!orgContext.showChooseOrganization) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-slate-900">Select organization</h1>
        <p className="mt-1 mb-5 text-sm text-slate-500">
          Choose the organization context for this session.
        </p>
        <OrgPicker />
      </div>
    </main>
  );
}
