import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { NotFoundError } from "@/lib/errors";
import { createComment, extractMentions, listComments } from "@/lib/services/comments";
import { createTask } from "@/lib/services/tasks";

const TENANT_A = `test_org_a_${process.pid}`;
const TENANT_B = `test_org_b_${process.pid}`;

const adminA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_admin" });
const adminB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: "user_b_admin" });

async function cleanup() {
  for (const t of [TENANT_A, TENANT_B]) {
    await prisma.govConMention.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConComment.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConNotification.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.govConTask.deleteMany({ where: { hubOrganizationId: t } });
  }
}

describe("comment service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("extractMentions parses @[name](id) markup + explicit ids, deduped", () => {
    const ids = extractMentions("hi @[Ada Lovelace](user_1) and @[Bob](user_2)", ["user_2", "user_3"]);
    assert.deepEqual(new Set(ids), new Set(["user_1", "user_2", "user_3"]));
  });

  test("creating a comment with mentions writes mention rows + notifications (not author)", async () => {
    const task = await createTask(adminA, { title: "Reviewable task" });
    const comment = await createComment(adminA, {
      taskId: task.id,
      body: "Please review @[Reviewer](user_reviewer) and @[Self](user_a_admin)",
    });

    // Mentions exclude the author.
    const mentions = await prisma.govConMention.findMany({ where: { commentId: comment.id } });
    assert.equal(mentions.length, 1);
    assert.equal(mentions[0].mentionedUserId, "user_reviewer");

    // Notification raised for the mentioned user, not the author.
    const notes = await prisma.govConNotification.findMany({
      where: { hubOrganizationId: TENANT_A, type: "MENTION" },
    });
    assert.equal(notes.length, 1);
    assert.equal(notes[0].recipientId, "user_reviewer");
    assert.equal(notes[0].actorId, "user_a_admin");

    // Audit written.
    const audit = await prisma.govConActivityEvent.findMany({
      where: { hubOrganizationId: TENANT_A, action: "comment.added" },
    });
    assert.equal(audit.length, 1);
  });

  test("explicit mentionedUserIds also create mentions + notifications", async () => {
    const task = await createTask(adminA, { title: "Explicit mentions" });
    const comment = await createComment(adminA, {
      taskId: task.id,
      body: "No inline mentions here",
      mentionedUserIds: ["user_x", "user_y"],
    });
    const mentions = await prisma.govConMention.findMany({ where: { commentId: comment.id } });
    assert.equal(mentions.length, 2);
  });

  test("listComments returns threaded parent + replies, tenant-scoped", async () => {
    const task = await createTask(adminA, { title: "Threaded task" });
    const parent = await createComment(adminA, { taskId: task.id, body: "Top level" });
    await createComment(adminA, { taskId: task.id, body: "A reply", parentCommentId: parent.id });

    const threads = await listComments(adminA, { taskId: task.id });
    const top = threads.find((c) => c.id === parent.id);
    assert.ok(top);
    assert.equal(top.replies.length, 1);
    assert.equal(top.replies[0].body, "A reply");

    // B sees nothing for A's task.
    const threadsB = await listComments(adminB, { taskId: task.id });
    assert.equal(threadsB.length, 0);
  });

  test("commenting on another tenant's task is rejected", async () => {
    const task = await createTask(adminA, { title: "A's task" });
    await assert.rejects(
      () => createComment(adminB, { taskId: task.id, body: "sneaky" }),
      (err: unknown) => err instanceof NotFoundError,
    );
  });
});
