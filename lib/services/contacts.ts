/**
 * Government/industry contact service + interaction log. Follows the GovCon
 * service contract (context + permission gate + tenant filter + audited
 * transactional mutations). Logging an interaction also advances the contact's
 * `lastInteractionAt`.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError, OperationalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  contactFilterSchema,
  createContactSchema,
  logInteractionSchema,
  updateContactSchema,
  type ContactFilter,
} from "@/lib/validation/contact";

async function guard<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && "status" in err) throw err;
    logger.exception("contact_service_failed", err, { op });
    throw new OperationalError("Contact operation failed", { cause: err });
  }
}

function toWriteData(input: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    data[k] = v;
  }
  return data;
}

export async function listContacts(ctx: GovConContext, rawFilter: unknown = {}) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const filter: ContactFilter = parseOrThrow(contactFilterSchema, rawFilter);

  const where: Prisma.GovConContactWhereInput = { hubOrganizationId: ctx.tenantOrgId };
  if (filter.agencyId) where.agencyId = filter.agencyId;
  if (filter.influence) where.influence = filter.influence;
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: "insensitive" } },
      { title: { contains: filter.q, mode: "insensitive" } },
      { organizationName: { contains: filter.q, mode: "insensitive" } },
      { email: { contains: filter.q, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.GovConContactOrderByWithRelationInput =
    filter.sortBy === "lastInteractionAt"
      ? { lastInteractionAt: { sort: filter.sortDir, nulls: "last" } }
      : filter.sortBy === "updatedAt"
        ? { updatedAt: filter.sortDir }
        : { name: filter.sortDir };

  return guard("list", () =>
    prisma.govConContact.findMany({
      where,
      orderBy,
      include: { agency: true, office: true },
    }),
  );
}

export async function listAgenciesSummary(ctx: GovConContext) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return guard("agencySummary", () =>
    prisma.govConAgency.findMany({
      where: { hubOrganizationId: ctx.tenantOrgId },
      orderBy: { name: "asc" },
      include: { _count: { select: { contacts: true, offices: true, opportunities: true } } },
    }),
  );
}

export async function getContact(ctx: GovConContext, id: string) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  const contact = await guard("get", () =>
    prisma.govConContact.findFirst({
      where: { id, hubOrganizationId: ctx.tenantOrgId },
      include: {
        agency: true,
        office: true,
        interactions: { orderBy: { occurredAt: "desc" }, take: 100 },
      },
    }),
  );
  if (!contact) throw new NotFoundError("Contact not found");
  return contact;
}

export async function createContact(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE);
  const input = parseOrThrow(createContactSchema, rawInput);

  return guard("create", () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.govConContact.create({
        data: {
          ...toWriteData(input),
          name: input.name,
          hubOrganizationId: ctx.tenantOrgId,
          createdBy: ctx.actorHubUserId,
          updatedBy: ctx.actorHubUserId,
        },
      });
      await recordAudit(tx, ctx, {
        action: "contact.created",
        entityType: "GovConContact",
        entityId: created.id,
        summary: `Added contact ${created.name}`,
      });
      return created;
    }),
  );
}

export async function updateContact(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE);
  const input = parseOrThrow(updateContactSchema, rawInput);

  return guard("update", () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.govConContact.findFirst({
        where: { id, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!existing) throw new NotFoundError("Contact not found");
      const updated = await tx.govConContact.update({
        where: { id: existing.id },
        data: { ...toWriteData(input), updatedBy: ctx.actorHubUserId },
      });
      await recordAudit(tx, ctx, {
        action: "contact.updated",
        entityType: "GovConContact",
        entityId: updated.id,
        summary: `Updated contact ${updated.name}`,
      });
      return updated;
    }),
  );
}

/** Record an interaction and advance the contact's lastInteractionAt. */
export async function logInteraction(ctx: GovConContext, contactId: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_CONTACTS_MANAGE);
  const input = parseOrThrow(logInteractionSchema, rawInput);

  return guard("logInteraction", () =>
    prisma.$transaction(async (tx) => {
      const contact = await tx.govConContact.findFirst({
        where: { id: contactId, hubOrganizationId: ctx.tenantOrgId },
      });
      if (!contact) throw new NotFoundError("Contact not found");

      const interaction = await tx.govConInteraction.create({
        data: {
          hubOrganizationId: ctx.tenantOrgId,
          contactId,
          occurredAt: input.occurredAt,
          channel: input.channel ?? null,
          summary: input.summary,
          followUp: input.followUp ?? null,
          opportunityId: input.opportunityId ?? null,
          createdBy: ctx.actorHubUserId,
        },
      });
      // Only advance if this interaction is the most recent one seen.
      if (!contact.lastInteractionAt || input.occurredAt > contact.lastInteractionAt) {
        await tx.govConContact.update({
          where: { id: contactId },
          data: { lastInteractionAt: input.occurredAt, updatedBy: ctx.actorHubUserId },
        });
      }
      await recordAudit(tx, ctx, {
        action: "contact.interaction_logged",
        entityType: "GovConContact",
        entityId: contactId,
        opportunityId: input.opportunityId ?? null,
        summary: `Logged ${input.channel ?? "interaction"} with ${contact.name}`,
      });
      return interaction;
    }),
  );
}
