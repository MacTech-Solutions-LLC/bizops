import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { orgContextFromHubSnapshot } from "@/lib/auth/org-context-server";
import { resolveAppHubAccess } from "@/lib/hub/client";

export default async function ChooseOrganizationPage() {
  const { userId, orgId } = auth();
  if (!userId) redirect("/sign-in");
  if (orgId) redirect("/");

  const hub = await resolveAppHubAccess(userId, null);
  const orgContext = orgContextFromHubSnapshot(hub, orgId);
  if (!orgContext.showChooseOrganization) {
    redirect("/");
  }

  return (
    <main className="shell" style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
      <h1>Select organization</h1>
      <p style={{ color: "var(--mt-text-2, #475569)", marginBottom: 24 }}>
        MacTech operators: choose the customer organization context for this session.
      </p>
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
      />
    </main>
  );
}
