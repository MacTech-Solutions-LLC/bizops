import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getProposal } from "@/lib/services/proposals";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { ProposalForm } from "@/components/proposals/proposal-form";

export const metadata: Metadata = { title: "Edit Proposal" };
export const dynamic = "force-dynamic";

export default async function EditProposalPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  let proposal;
  try {
    proposal = await getProposal(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROPOSAL_MANAGE)) {
    return (
      <>
        <PageHeader title="Edit Proposal" />
        <PermissionState description="You need proposal management permission to edit this proposal." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Proposal" subtitle={proposal.title} />
      <ProposalForm
        mode="edit"
        opportunities={[]}
        values={{
          id: proposal.id,
          version: proposal.version,
          title: proposal.title,
          managerId: proposal.managerId,
          dueAt: proposal.dueAt ? proposal.dueAt.toISOString() : null,
          status: proposal.status,
          notes: proposal.notes,
        }}
      />
    </>
  );
}
