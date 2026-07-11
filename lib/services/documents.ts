/** Document metadata service — tenant-scoped. Never stores binaries. */

import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validation/document";

export async function listDocuments(
  ctx: GovConContext,
  opts: { opportunityId?: string; category?: string } = {},
) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_VIEW);
  return prisma.govConDocument.findMany({
    where: {
      hubOrganizationId: ctx.tenantOrgId,
      ...(opts.opportunityId ? { opportunityId: opts.opportunityId } : {}),
      ...(opts.category ? { category: opts.category as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { opportunity: { select: { id: true, internalName: true } } },
    take: 200,
  });
}

export async function createDocument(ctx: GovConContext, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DOCUMENTS_MANAGE);
  const input = parseOrThrow(createDocumentSchema, rawInput);
  return prisma.$transaction(async (tx) => {
    const created = await tx.govConDocument.create({
      data: {
        hubOrganizationId: ctx.tenantOrgId,
        name: input.name,
        category: input.category ?? "OTHER",
        version: input.version ?? null,
        status: input.status ?? "DRAFT",
        ownerId: ctx.actorHubUserId,
        opportunityId: input.opportunityId ?? null,
        partnerId: input.partnerId ?? null,
        storageProvider: input.storageProvider ?? "railway_volume",
        storageReference: input.storageReference ?? null,
        sensitivityMarking: input.sensitivityMarking ?? null,
        effectiveDate: input.effectiveDate ?? null,
        expirationDate: input.expirationDate ?? null,
        notes: input.notes ?? null,
        uploadedBy: ctx.actorHubUserId,
        uploadedAt: new Date(),
      },
    });
    await recordAudit(tx, ctx, {
      action: "document.created",
      eventCategory: "evidence",
      entityType: "GovConDocument",
      entityId: created.id,
      opportunityId: created.opportunityId,
      summary: `Registered document “${created.name}”`,
      after: { name: created.name, category: created.category, status: created.status },
    });
    return created;
  });
}

export async function updateDocument(ctx: GovConContext, id: string, rawInput: unknown) {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_DOCUMENTS_MANAGE);
  const input = parseOrThrow(updateDocumentSchema, rawInput);
  const existing = await prisma.govConDocument.findFirst({
    where: { id, hubOrganizationId: ctx.tenantOrgId },
  });
  if (!existing) throw new NotFoundError("Document not found");
  return prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) if (v !== undefined) data[k] = v;
    const updated = await tx.govConDocument.update({ where: { id: existing.id }, data });
    await recordAudit(tx, ctx, {
      action: "document.updated",
      eventCategory: "evidence",
      entityType: "GovConDocument",
      entityId: existing.id,
      opportunityId: existing.opportunityId,
      summary: `Updated document “${updated.name}”`,
      before: { status: existing.status, version: existing.version },
      after: { status: updated.status, version: updated.version },
    });
    return updated;
  });
}
