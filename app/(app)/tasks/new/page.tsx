import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { listOpportunityOptions } from "@/lib/services/reference";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "New Task" };
export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const ctx = await requireGovConContext();
  if (!hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_TASKS_MANAGE)) {
    return (
      <>
        <PageHeader title="New Task" />
        <PermissionState description="You need task-management permission to create tasks." />
      </>
    );
  }
  const opportunities = await listOpportunityOptions(ctx);

  return (
    <>
      <PageHeader title="New Task" subtitle="Add a task and optionally link it to a pursuit." />
      <TaskForm opportunities={opportunities.map((o) => ({ id: o.id, internalName: o.internalName }))} />
    </>
  );
}
