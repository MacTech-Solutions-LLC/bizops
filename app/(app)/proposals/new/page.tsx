import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listOpportunities } from "@/lib/services/opportunities";
import { hasGovConPermission, requireGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { ProposalForm } from "@/components/proposals/proposal-form";

export const metadata: Metadata = { title: "New Proposal" };
export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE)) {
    return (
      <>
        <PageHeader title="New Proposal" />
        <PermissionState description="You need proposal management permission to create a proposal." />
      </>
    );
  }
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);

  // Query pursuits inline for the opportunity picker (excludes closed stages).
  const result = await listOpportunities(ctx, { pageSize: 200, sortBy: "internalName", sortDir: "asc" });
  const opportunities = result.items.map((o) => ({
    id: o.id,
    name: o.solicitationNumber ? `${o.internalName} (${o.solicitationNumber})` : o.internalName,
  }));

  return (
    <>
      <PageHeader title="New Proposal" subtitle="Stand up a proposal room for a pursuit." />
      <ProposalForm mode="create" opportunities={opportunities} />
    </>
  );
}
