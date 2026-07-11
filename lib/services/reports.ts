/**
 * Reporting service — tenant-scoped aggregate reads over the pipeline. All
 * reports require GOVCON_REPORTS_VIEW; exports additionally require GOVCON_EXPORT
 * at the route layer. Pure aggregation, no predictive claims beyond weighted =
 * value × PWin.
 */

import { prisma } from "@/lib/db/prisma";
import { requireGovConPermission, type GovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import {
  PIPELINE_ORDER,
  isClosedStage,
  toNumber,
  weightedValue,
  winRate,
} from "@/lib/domain/metrics";
import { GovConStage } from "@prisma/client";

export interface GroupRow {
  key: string;
  label: string;
  count: number;
  totalValue: number;
  weightedValue: number;
}

export interface ReportsData {
  generatedAt: string;
  byStage: GroupRow[];
  byAgency: GroupRow[];
  byNaics: GroupRow[];
  byVehicle: GroupRow[];
  byOwner: GroupRow[];
  winLoss: { won: number; lost: number; noBid: number; winRate: number | null; awardedValue: number };
  noBidReasons: Array<{ reason: string; count: number }>;
  aging: Array<{ bucket: string; count: number }>;
  forecast: Array<{ month: string; weightedValue: number; count: number }>;
}

export async function getReportsData(ctx: GovConContext): Promise<ReportsData> {
  requireGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_REPORTS_VIEW);
  const org = ctx.tenantOrgId;

  const [opps, outcomes] = await Promise.all([
    prisma.govConOpportunity.findMany({
      where: { hubOrganizationId: org },
      select: {
        id: true,
        stage: true,
        estimatedValue: true,
        pWin: true,
        naics: true,
        agencyId: true,
        vehicleId: true,
        captureOwnerId: true,
        expectedAwardDate: true,
        createdAt: true,
        archivedAt: true,
        agency: { select: { name: true } },
        vehicle: { select: { name: true } },
      },
    }),
    prisma.govConOutcome.findMany({
      where: { hubOrganizationId: org },
      select: { result: true, awardedValue: true, reason: true },
    }),
  ]);

  const active = opps.filter((o) => !o.archivedAt && !isClosedStage(o.stage));

  const group = (
    keyFn: (o: (typeof opps)[number]) => string | null,
    labelFn: (o: (typeof opps)[number], key: string) => string,
  ): GroupRow[] => {
    const map = new Map<string, GroupRow>();
    for (const o of active) {
      const key = keyFn(o) ?? "unassigned";
      const row = map.get(key) ?? { key, label: labelFn(o, key), count: 0, totalValue: 0, weightedValue: 0 };
      row.count += 1;
      row.totalValue += toNumber(o.estimatedValue);
      row.weightedValue += weightedValue(o.estimatedValue, o.pWin);
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.weightedValue - a.weightedValue);
  };

  // By stage in canonical order.
  const stageMap = new Map<GovConStage, GroupRow>();
  for (const s of PIPELINE_ORDER)
    stageMap.set(s, { key: s, label: s, count: 0, totalValue: 0, weightedValue: 0 });
  for (const o of opps) {
    const row = stageMap.get(o.stage)!;
    row.count += 1;
    row.totalValue += toNumber(o.estimatedValue);
    row.weightedValue += weightedValue(o.estimatedValue, o.pWin);
  }

  // Win/loss from outcomes.
  const won = outcomes.filter((o) => o.result === "AWARDED").length;
  const lost = outcomes.filter((o) => o.result === "LOST").length;
  const noBid = outcomes.filter((o) => o.result === "NO_BID").length;
  const awardedValue = outcomes
    .filter((o) => o.result === "AWARDED")
    .reduce((s, o) => s + toNumber(o.awardedValue), 0);

  // No-bid reasons.
  const reasonMap = new Map<string, number>();
  for (const o of outcomes.filter((o) => o.result === "NO_BID" && o.reason)) {
    const r = o.reason!.trim();
    reasonMap.set(r, (reasonMap.get(r) ?? 0) + 1);
  }

  // Aging buckets (days since created) for active pursuits.
  const now = Date.now();
  const buckets = [
    { bucket: "0–30d", max: 30 },
    { bucket: "31–60d", max: 60 },
    { bucket: "61–90d", max: 90 },
    { bucket: "90d+", max: Infinity },
  ];
  const aging = buckets.map((b) => ({ bucket: b.bucket, count: 0 }));
  for (const o of active) {
    const days = (now - o.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    const idx = buckets.findIndex((b) => days <= b.max);
    aging[idx === -1 ? aging.length - 1 : idx].count += 1;
  }

  // Weighted forecast by expected-award month.
  const forecastMap = new Map<string, { weightedValue: number; count: number }>();
  for (const o of active.filter((o) => o.expectedAwardDate)) {
    const d = o.expectedAwardDate!;
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const row = forecastMap.get(month) ?? { weightedValue: 0, count: 0 };
    row.weightedValue += weightedValue(o.estimatedValue, o.pWin);
    row.count += 1;
    forecastMap.set(month, row);
  }

  return {
    generatedAt: new Date().toISOString(),
    byStage: [...stageMap.values()],
    byAgency: group(
      (o) => o.agencyId,
      (o) => o.agency?.name?.replace("[DEMO] ", "") ?? "Unassigned",
    ),
    byNaics: group(
      (o) => o.naics,
      (_o, k) => (k === "unassigned" ? "Unassigned" : k),
    ),
    byVehicle: group(
      (o) => o.vehicleId,
      (o) => o.vehicle?.name?.replace("[DEMO] ", "") ?? "No vehicle",
    ),
    byOwner: group(
      (o) => o.captureOwnerId,
      (_o, k) => (k === "unassigned" ? "Unassigned" : k),
    ),
    winLoss: { won, lost, noBid, winRate: winRate(won, lost), awardedValue },
    noBidReasons: [...reasonMap.entries()].map(([reason, count]) => ({ reason, count })),
    aging,
    forecast: [...forecastMap.entries()]
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}
