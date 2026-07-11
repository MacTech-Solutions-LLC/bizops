import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, NotFoundError } from "@/lib/errors";
import {
  changeTaskStatus,
  createTask,
  getTaskBoard,
  listTasks,
} from "@/lib/services/tasks";

const TENANT_A = `test_org_a_${process.pid}`;
const TENANT_B = `test_org_b_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });
const adminB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: "user_b_admin" });
const viewerA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: "user_a_viewer",
  roles: ["govcon_viewer"],
  permissions: new Set([GOVCON_PERMISSIONS.GOVCON_VIEW]),
});

async function cleanup() {
  for (const t of [TENANT_A, TENANT_B]) {
    await prisma.govConNotification.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConTask.deleteMany({ where: { hubOrganizationId: t } });
  }
}

describe("task service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("create requires GOVCON_TASKS_MANAGE", async () => {
    await assert.rejects(
      () => createTask(viewerA, { title: "Nope" }),
      (err: unknown) => err instanceof AuthzError,
    );
    const created = await createTask(adminA, { title: "Draft outline", priority: "HIGH" });
    assert.equal(created.hubOrganizationId, TENANT_A);
    assert.equal(created.title, "Draft outline");
    assert.equal(created.status, "TODO");
    assert.equal(created.creatorId, "user_a_admin");
    const audit = await prisma.govConActivityEvent.findMany({
      where: { entityId: created.id, action: "task.created" },
    });
    assert.equal(audit.length, 1);
  });

  test("tenant isolation: B cannot see or move A's task", async () => {
    const created = await createTask(adminA, { title: "A-only task" });
    const boardB = await getTaskBoard(adminB);
    const allB = Object.values(boardB.tasksByStatus).flat();
    assert.equal(allB.some((t) => t.id === created.id), false);
    await assert.rejects(
      () => changeTaskStatus(adminB, created.id, "IN_PROGRESS"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  test("changeTaskStatus to COMPLETE sets completedAt + writes audit", async () => {
    const created = await createTask(adminA, { title: "Finish me", status: "IN_PROGRESS" });
    assert.equal(created.completedAt, null);
    const done = await changeTaskStatus(adminA, created.id, "COMPLETE");
    assert.equal(done.status, "COMPLETE");
    assert.ok(done.completedAt);
    const audit = await prisma.govConActivityEvent.findMany({
      where: { entityId: created.id, action: "task.status_changed" },
    });
    assert.equal(audit.length, 1);
    // Moving back off COMPLETE clears completedAt.
    const reopened = await changeTaskStatus(adminA, created.id, "TODO");
    assert.equal(reopened.completedAt, null);
  });

  test("assigning a task to another user creates an ASSIGNMENT notification", async () => {
    const created = await createTask(adminA, { title: "Assigned work", assigneeId: "user_a_other" });
    const notes = await prisma.govConNotification.findMany({
      where: { hubOrganizationId: TENANT_A, recipientId: "user_a_other", type: "ASSIGNMENT" },
    });
    assert.equal(notes.length, 1);
    assert.equal(notes[0].entityId, created.id);
    assert.equal(notes[0].actorId, "user_a_admin");
  });

  test("self-assignment does not create a notification", async () => {
    await createTask(adminA, { title: "My own task", assigneeId: "user_a_admin" });
    const notes = await prisma.govConNotification.findMany({
      where: { hubOrganizationId: TENANT_A, recipientId: "user_a_admin", type: "ASSIGNMENT" },
    });
    assert.equal(notes.length, 0);
  });

  test("listTasks is tenant + filter scoped", async () => {
    await cleanup();
    await createTask(adminA, { title: "Backlog item", status: "BACKLOG" });
    await createTask(adminA, { title: "Todo item", status: "TODO" });
    const backlog = await listTasks(adminA, { status: "BACKLOG" });
    assert.equal(backlog.length, 1);
    assert.equal(backlog[0].status, "BACKLOG");
    const listB = await listTasks(adminB, {});
    assert.equal(listB.length, 0);
  });
});
