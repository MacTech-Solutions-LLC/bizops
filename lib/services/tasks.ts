/**
 * Task service — the execution layer for pursuits.
 *
 * Every function:
 *  - takes a `GovConContext` and enforces the required permission
 *    (`GOVCON_TASKS_MANAGE` to write, `GOVCON_VIEW` to read),
 *  - filters every query by `ctx.tenantOrgId` (no cross-tenant reads),
 *  - records an audit event for material mutations inside the transaction,
 *  - creates an ASSIGNMENT notification when a task is assigned to someone
 *    other than the actor (in the same transaction).
 */

import { Prisma, type GovConTask, type GovConTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { ConflictError, NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  changeTaskStatusSchema,
  checklistItemSchema,
  createTaskSchema,
  taskFilterSchema,
  updateTaskSchema,
  type ChecklistItem,
  type TaskFilter,
} from "@/lib/validation/task";

/** The 7 GovConTaskStatus board columns, in workflow order. */
export const TASK_STATUS_COLUMNS: GovConTaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "INTERNAL_REVIEW",
  "REVISION_REQUIRED",
  "APPROVED",
  "COMPLETE",
];

const OPP_SELECT = { select: { id: true, internalName: true } } as const;

export type TaskWithOpportunity = GovConTask & {
  opportunity: { id: string; internalName: string } | null;
};

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("task_service_failed", err, { op });
    throw new OperationalError("Task operation failed", { cause: err });
  }
}

function tenantWhere(ctx: GovConContext, filter: TaskFilter): Prisma.GovConTaskWhereInput {
  return {
    hubOrganizationId: ctx.tenantOrgId,
    ...(filter.opportunityId ? { opportunityId: filter.opportunityId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
  };
}

/** Flat, tenant-scoped list with optional filters. */
export async function listTasks(
  ctx: GovConContext,
  rawFilter: unknown = {},
): Promise<TaskWithOpportunity[]> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter = parseOrThrow(taskFilterSchema, rawFilter);
  return guard("list", () =>
    prisma.govConTask.findMany({
      where: tenantWhere(ctx, filter),
      orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }],
      include: { opportunity: OPP_SELECT },
    }),
  );
}

/** Tasks grouped by their status column — always returns all 7 keys. */
export async function groupTasksByStatus(
  ctx: GovConContext,
  rawFilter: unknown = {},
): Promise<Record<GovConTaskStatus, TaskWithOpportunity[]>> {
  const tasks = await listTasks(ctx, rawFilter);
  const grouped = Object.fromEntries(
    TASK_STATUS_COLUMNS.map((s) => [s, [] as TaskWithOpportunity[]]),
  ) as Record<GovConTaskStatus, TaskWithOpportunity[]>;
  for (const t of tasks) grouped[t.status].push(t);
  return grouped;
}

export interface TaskBoard {
  columns: GovConTaskStatus[];
  tasksByStatus: Record<GovConTaskStatus, TaskWithOpportunity[]>;
}

/** The full Kanban board for the tenant, grouped into the 7 status columns. */
export async function getTaskBoard(
  ctx: GovConContext,
  rawFilter: unknown = {},
): Promise<TaskBoard> {
  const tasksByStatus = await groupTasksByStatus(ctx, rawFilter);
  return { columns: TASK_STATUS_COLUMNS, tasksByStatus };
}

export async function getTask(ctx: GovConContext, id: string): Promise<TaskWithOpportunity> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const task = await guard("get", () =>
    prisma.govConTask.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: { opportunity: OPP_SELECT },
    }),
  );
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

/** If the target opportunity id is set, verify it belongs to this tenant. */
async function assertOpportunityInTenant(
  db: Prisma.TransactionClient,
  ctx: GovConContext,
  opportunityId: string | null | undefined,
): Promise<void> {
  if (!opportunityId) return;
  const opp = await db.govConOpportunity.findFirst({
    where: { id: opportunityId, hubOrganizationId: ctx.tenantOrgId },
    select: { id: true },
  });
  if (!opp) throw new NotFoundError("Opportunity not found");
}

/** Create an ASSIGNMENT notification for a newly-assigned user (never the actor). */
async function notifyAssignment(
  db: Prisma.TransactionClient,
  ctx: GovConContext,
  task: GovConTask,
): Promise<void> {
  if (!task.assigneeId || task.assigneeId === ctx.actorHubUserId) return;
  await db.govConNotification.create({
    data: {
      hubOrganizationId: ctx.tenantOrgId,
      recipientId: task.assigneeId,
      type: "ASSIGNMENT",
      title: `You were assigned “${task.title}”`,
      body: task.description ?? null,
      entityType: "GovConTask",
      entityId: task.id,
      opportunityId: task.opportunityId ?? null,
      link: `/tasks?task=${task.id}`,
      actorId: ctx.actorHubUserId,
    },
  });
}

export async function createTask(ctx: GovConContext, rawInput: unknown): Promise<GovConTask> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_TASKS_MANAGE);
  const input = parseOrThrow(createTaskSchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      await assertOpportunityInTenant(tx, ctx, input.opportunityId);
      const created = await tx.govConTask.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          title: input.title,
          description: input.description ?? null,
          opportunityId: input.opportunityId ?? null,
          proposalId: input.proposalId ?? null,
          assigneeId: input.assigneeId ?? null,
          priority: input.priority ?? "MEDIUM",
          status: input.status ?? "TODO",
          startDate: input.startDate ?? null,
          dueAt: input.dueAt ?? null,
          tags: input.tags ?? [],
          watchers: input.watchers ?? [],
          checklistJson: (input.checklist ?? undefined) as Prisma.InputJsonValue | undefined,
          creatorId: ctx.actorHubUserId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await notifyAssignment(tx, ctx, created);
      await recordAudit(tx, ctx, {
        action: "task.created",
        entityType: "GovConTask",
        entityId: created.id,
        opportunityId: created.opportunityId,
        summary: `Created task “${created.title}”`,
        after: auditSnapshot(created),
      });
      return created;
    }),
  );
}

export async function updateTask(
  ctx: GovConContext,
  id: string,
  rawInput: unknown,
): Promise<GovConTask> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_TASKS_MANAGE);
  const input = parseOrThrow(updateTaskSchema, rawInput);

  return guard("update", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConTask.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Task not found");
      assertVersion(existing.version, input.expectedVersion);
      if (input.opportunityId) await assertOpportunityInTenant(tx, ctx, input.opportunityId);

      const data = toWriteData(input);
      const updated = await tx.govConTask.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: ctx.actorHubUserId, version: { increment: 1 } },
      });

      // Notify only on a genuine reassignment to a new user.
      if (updated.assigneeId && updated.assigneeId !== existing.assigneeId) {
        await notifyAssignment(tx, ctx, updated);
      }

      await recordAudit(tx, ctx, {
        action: "task.updated",
        entityType: "GovConTask",
        entityId: updated.id,
        opportunityId: updated.opportunityId,
        summary: `Updated task “${updated.title}”`,
        before: auditSnapshot(existing),
        after: auditSnapshot(updated),
      });
      return updated;
    }),
  );
}

export async function changeTaskStatus(
  ctx: GovConContext,
  id: string,
  rawStatus: unknown,
): Promise<GovConTask> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_TASKS_MANAGE);
  const { status } = parseOrThrow(changeTaskStatusSchema, { status: rawStatus });

  return guard("changeStatus", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConTask.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Task not found");
      if (existing.status === status) return existing;

      const updated = await tx.govConTask.update({
        where: { id: existing.id },
        data: {
          status,
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
          completedAt:
            status === "COMPLETE"
              ? existing.completedAt ?? new Date()
              : null,
        },
      });
      await recordAudit(tx, ctx, {
        action: "task.status_changed",
        entityType: "GovConTask",
        entityId: existing.id,
        opportunityId: existing.opportunityId,
        summary: `Task “${existing.title}” ${existing.status} → ${status}`,
        before: { status: existing.status },
        after: { status },
      });
      return updated;
    }),
  );
}

/** Parse + normalise the checklist stored on a task. */
function readChecklist(task: GovConTask): ChecklistItem[] {
  const raw = task.checklistJson;
  if (!Array.isArray(raw)) return [];
  const items: ChecklistItem[] = [];
  for (const entry of raw) {
    const parsed = checklistItemSchema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

async function writeChecklist(
  ctx: GovConContext,
  id: string,
  next: ChecklistItem[],
  action: string,
  summary: string,
): Promise<GovConTask> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_TASKS_MANAGE);
  return guard("checklist", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConTask.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Task not found");
      const updated = await tx.govConTask.update({
        where: { id: existing.id },
        data: {
          checklistJson: next as unknown as Prisma.InputJsonValue,
          updatedBy: ctx.actorHubUserId,
          version: { increment: 1 },
        },
      });
      await recordAudit(tx, ctx, {
        action,
        entityType: "GovConTask",
        entityId: existing.id,
        opportunityId: existing.opportunityId,
        summary,
      });
      return updated;
    }),
  );
}

export async function addChecklistItem(
  ctx: GovConContext,
  id: string,
  text: string,
): Promise<GovConTask> {
  const item = parseOrThrow(checklistItemSchema, { text, done: false });
  const existing = await getTask(ctx, id);
  const next = [...readChecklist(existing), item];
  return writeChecklist(ctx, id, next, "task.checklist_added", `Added checklist item to “${existing.title}”`);
}

export async function toggleChecklistItem(
  ctx: GovConContext,
  id: string,
  index: number,
): Promise<GovConTask> {
  const existing = await getTask(ctx, id);
  const items = readChecklist(existing);
  if (index < 0 || index >= items.length) throw new NotFoundError("Checklist item not found");
  items[index] = { ...items[index], done: !items[index].done };
  return writeChecklist(ctx, id, items, "task.checklist_toggled", `Toggled checklist item on “${existing.title}”`);
}

function assertVersion(current: number, expected: number | undefined): void {
  if (expected !== undefined && expected !== current) {
    throw new ConflictError("This task was modified by someone else.", {
      context: { current, expected },
    });
  }
}

/** Strip undefined + non-writable keys so update() only writes provided fields. */
function toWriteData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "expectedVersion" || k === "checklist" || k === "proposalId") continue;
    if (v === undefined) continue;
    data[k] = v;
  }
  return data;
}

function auditSnapshot(t: GovConTask): Record<string, unknown> {
  return {
    title: t.title,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    dueAt: t.dueAt,
    opportunityId: t.opportunityId,
  };
}

export type { GovConTaskStatus };
