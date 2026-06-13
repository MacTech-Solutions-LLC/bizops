import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ChooseOrganizationPage() {
  const { userId, orgId } = auth();
  if (!userId) redirect("/sign-in");
  if (orgId) redirect("/");

  return (
    <main className="shell" style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
      <h1>Select organization</h1>
      <p style={{ color: "var(--mt-text-2, #475569)", marginBottom: 24 }}>
        BizOps requires an active MacTech organization. Choose one below to continue.
      </p>
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
      />
    </main>
  );
}
