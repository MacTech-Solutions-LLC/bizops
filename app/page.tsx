import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { requireAppAuthContext } from "@/lib/auth/context";
import { getCompanyProfile } from "@/lib/domain/bizops";

export default async function HomePage() {
  const ctx = await requireAppAuthContext();
  const { orgSlug } = auth();
  const profile = await getCompanyProfile(ctx.hub.tenant.organizationId);
  const orgName =
    profile?.legalName ?? (orgSlug ? orgSlug.replace(/-/g, " ") : null);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>BizOps</h1>
      <p style={{ color: "var(--mt-text-2, #475569)" }}>
        {orgName
          ? `Workspace for ${orgName}`
          : `Organization ${ctx.hub.tenant.organizationId}`}
      </p>
      <div
        style={{
          display: "grid",
          gap: "12px",
          marginTop: "24px",
          maxWidth: "480px",
        }}
      >
        <DashboardLink href="/company" title="Company Profile">
          Legal identity, CAGE code, and business details.
        </DashboardLink>
        <DashboardLink href="/team" title="Team">
          Team members and roles for your organization.
        </DashboardLink>
        <DashboardLink href="/campaigns" title="Campaigns">
          Marketing and outreach campaigns.
        </DashboardLink>
      </div>
    </div>
  );
}

function DashboardLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid var(--mt-hairline, #e2e8f0)",
        background: "var(--mt-surface-1, #fff)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <strong style={{ display: "block", marginBottom: "4px" }}>{title}</strong>
      <span style={{ fontSize: "14px", color: "var(--mt-text-2, #475569)" }}>
        {children}
      </span>
    </Link>
  );
}
