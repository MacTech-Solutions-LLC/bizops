import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  createDirectoryContact,
  createDirectoryOrganization,
  getDirectoryContact,
  getDirectoryOrganization,
  listDirectoryContacts,
  listDirectoryOrganizations,
  updateDirectoryContact,
} from "@/lib/services/directory";
import { directoryServiceContext, requireDirectoryServiceCaller } from "@/lib/service-auth";
import { UnauthenticatedError, OperationalError } from "@/lib/errors";

const TENANT_A = `test_directory_a_${process.pid}`;
const TENANT_B = `test_directory_b_${process.pid}`;

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
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.directoryContact.deleteMany({ where: { hubOrganizationId: t } });
    await prisma.directoryOrganization.deleteMany({ where: { hubOrganizationId: t } });
  }
}

describe("directory service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("create requires GOVCON_DIRECTORY_MANAGE", async () => {
    await assert.rejects(
      () => createDirectoryContact(viewerA, { name: "Viewer Person" }),
      (err: unknown) => err instanceof AuthzError,
    );
    await assert.rejects(
      () => createDirectoryOrganization(viewerA, { name: "Viewer Org" }),
      (err: unknown) => err instanceof AuthzError,
    );
  });

  test("closed vocabulary: unknown kind is rejected, never guessed", async () => {
    await assert.rejects(
      () => createDirectoryContact(adminA, { name: "Bad Kind", kind: "FRIENDLY" }),
      (err: unknown) => err instanceof ValidationError,
    );
  });

  test("contact create/update with org link, tags, and clearing via empty string", async () => {
    const org = await createDirectoryOrganization(adminA, {
      name: "Naval Air Systems Command",
      orgType: "GOVERNMENT",
      abbreviation: "NAVAIR",
    });
    const contact = await createDirectoryContact(adminA, {
      name: "Jane Doe",
      kind: "EXTERNAL",
      organizationId: org.id,
      email: "jane.doe@navy.mil",
      tags: "contracting, ko",
    });
    assert.equal(contact.hubOrganizationId, TENANT_A);
    assert.equal(contact.sourceApp, "bizops");
    assert.deepEqual(contact.tags, ["contracting", "ko"]);

    // Partial update: untouched fields survive; "" clears.
    const updated = await updateDirectoryContact(adminA, contact.id, { title: "KO", email: "" });
    assert.equal(updated.title, "KO");
    assert.equal(updated.email, null);
    assert.equal(updated.organizationId, org.id);

    const fetched = await getDirectoryContact(adminA, contact.id);
    assert.equal(fetched.organization?.name, "Naval Air Systems Command");
  });

  test("linking a contact to a foreign tenant's organization is rejected", async () => {
    const orgB = await createDirectoryOrganization(adminB, { name: "B Corp" });
    await assert.rejects(
      () => createDirectoryContact(adminA, { name: "Sneaky", organizationId: orgB.id }),
      (err: unknown) => err instanceof ValidationError,
    );
  });

  test("tenant isolation: B cannot read A's records", async () => {
    const contact = await createDirectoryContact(adminA, { name: "Iso Person" });
    await assert.rejects(
      () => getDirectoryContact(adminB, contact.id),
      (err: unknown) => err instanceof NotFoundError,
    );
    const listB = await listDirectoryContacts(adminB, {});
    assert.equal(listB.some((c) => c.id === contact.id), false);
  });

  test("filters: kind, search, and archived exclusion", async () => {
    await createDirectoryContact(adminA, { name: "Insider Ann", kind: "INTERNAL" });
    await createDirectoryContact(adminA, { name: "Archived Al", status: "ARCHIVED" });

    const internal = await listDirectoryContacts(adminA, { kind: "INTERNAL" });
    assert.equal(internal.some((c) => c.name === "Insider Ann"), true);
    assert.equal(internal.some((c) => c.kind !== "INTERNAL"), false);

    const active = await listDirectoryContacts(adminA, {});
    assert.equal(active.some((c) => c.name === "Archived Al"), false);
    const archived = await listDirectoryContacts(adminA, { status: "ARCHIVED" });
    assert.equal(archived.some((c) => c.name === "Archived Al"), true);

    const search = await listDirectoryContacts(adminA, { q: "insider" });
    assert.equal(search.length >= 1 && search.every((c) => /insider/i.test(c.name)), true);
  });

  test("org list carries contact counts; duplicate org name in tenant rejected", async () => {
    const orgs = await listDirectoryOrganizations(adminA, {});
    const navair = orgs.find((o) => o.abbreviation === "NAVAIR");
    assert.ok(navair);
    assert.equal(typeof navair._count.contacts, "number");
    await assert.rejects(
      () => createDirectoryOrganization(adminA, { name: "Naval Air Systems Command" }),
      (err: unknown) => err instanceof ValidationError && Boolean(err.issues?.name),
    );
    const detail = await getDirectoryOrganization(adminA, navair.id);
    assert.equal(detail.contacts.some((c) => c.name === "Jane Doe"), true);
  });

  test("service-context writes record the source app and service actor", async () => {
    const svcCtx = directoryServiceContext("fieldops", TENANT_A);
    const created = await createDirectoryContact(svcCtx, { name: "From Fieldops" });
    assert.equal(created.sourceApp, "fieldops");
    assert.equal(created.createdBy, "service:fieldops");
    // Service context only holds directory permissions.
    assert.equal(svcCtx.permissions.has(GOVCON_PERMISSIONS.GOVCON_DIRECTORY_MANAGE), true);
    assert.equal(svcCtx.permissions.size, 2);
  });
});

describe("directory service auth", () => {
  const TOKEN = "test-directory-token-0123456789";

  function req(headers: Record<string, string>): Request {
    return new Request("https://bizops.test/api/directory/contacts", { headers });
  }

  test("rejects when the endpoint is unconfigured", () => {
    delete process.env.MACTECH_DIRECTORY_SERVICE_TOKEN;
    assert.throws(
      () => requireDirectoryServiceCaller(req({ authorization: `Bearer ${TOKEN}` })),
      (err: unknown) => err instanceof OperationalError,
    );
  });

  test("rejects a missing or wrong token, requires the service-app header", () => {
    process.env.MACTECH_DIRECTORY_SERVICE_TOKEN = TOKEN;
    assert.throws(
      () => requireDirectoryServiceCaller(req({})),
      (err: unknown) => err instanceof UnauthenticatedError,
    );
    assert.throws(
      () => requireDirectoryServiceCaller(req({ authorization: "Bearer wrong-token-000000000000" })),
      (err: unknown) => err instanceof UnauthenticatedError,
    );
    assert.throws(
      () => requireDirectoryServiceCaller(req({ authorization: `Bearer ${TOKEN}` })),
      (err: unknown) => err instanceof UnauthenticatedError,
    );
    const ok = requireDirectoryServiceCaller(
      req({ authorization: `Bearer ${TOKEN}`, "x-mactech-service-app": "Fieldops" }),
    );
    assert.equal(ok.sourceApp, "fieldops");
    delete process.env.MACTECH_DIRECTORY_SERVICE_TOKEN;
  });

  test("service context requires a tenant org id", () => {
    assert.throws(
      () => directoryServiceContext("fieldops", ""),
      (err: unknown) => err instanceof ValidationError,
    );
    const ctx = directoryServiceContext("fieldops", " org_123 ");
    assert.equal(ctx.tenantOrgId, "org_123");
    assert.equal(ctx.actorHubUserId, "service:fieldops");
  });
});
