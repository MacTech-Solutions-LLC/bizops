import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getTaskBoard } from "@/lib/services/tasks";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, ErrorState } from "@/components/ui/misc";
import { TaskBoard, type TaskCard } from "@/components/tasks/task-board";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const ctx = await requireGovConContext();
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_TASKS_MANAGE);

  let body: React.ReactNode;
  try {
    const board = await getTaskBoard(ctx);
    const tasksByStatus: Record<string, TaskCard[]> = {};
    for (const status of board.columns) {
      tasksByStatus[status] = board.tasksByStatus[status].map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        opportunity: t.opportunity
          ? { id: t.opportunity.id, internalName: t.opportunity.internalName }
          : null,
      }));
    }
    body = (
      <TaskBoard columns={board.columns} tasksByStatus={tasksByStatus} canManage={canManage} />
    );
  } catch {
    body = <ErrorState title="Tasks unavailable" />;
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Capture and proposal work across every pursuit, on one board."
      />
      {body}
    </>
  );
}
