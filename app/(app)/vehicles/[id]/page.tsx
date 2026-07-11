import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getVehicle } from "@/lib/services/vehicles";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { NotFoundError } from "@/lib/errors";
import { toNumber } from "@/lib/domain/metrics";
import { formatCurrency, formatCurrencyFull, formatDate } from "@/lib/ui/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Field } from "@/components/ui/misc";
import { STAGE_STYLES, VEHICLE_STATUS_STYLES } from "@/lib/ui/status";

export const metadata: Metadata = { title: "Contract Vehicle" };
export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireGovConContext();
  let vehicle;
  try {
    vehicle = await getVehicle(ctx, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PARTNERS_MANAGE);

  return (
    <>
      <div className="mb-4">
        <Link href="/vehicles" className="text-sm text-blue-600 hover:underline">← Contract Vehicles</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{vehicle.name.replace("[DEMO] ", "")}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {vehicle.vehicleType ?? "—"}{vehicle.contractNumber ? ` · ${vehicle.contractNumber}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill map={VEHICLE_STATUS_STYLES} value={vehicle.status} />
            {canManage && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/vehicles/${vehicle.id}/edit`}>Edit</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Overview" />
            <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Field label="Agency">{vehicle.agency ?? "—"}</Field>
              <Field label="Prime holder">{vehicle.primeHolder ?? "—"}</Field>
              <Field label="Ceiling">{formatCurrencyFull(vehicle.ceiling ? toNumber(vehicle.ceiling) : null)}</Field>
              <Field label="Ordering status">{vehicle.orderingStatus ?? "—"}</Field>
              <Field label="Subcontract access">{vehicle.subcontractAccess ? "Yes" : "No"}</Field>
              <Field label="Option periods">{vehicle.optionPeriods ?? "—"}</Field>
              <Field label="Start">{formatDate(vehicle.startDate)}</Field>
              <Field label="End">{formatDate(vehicle.endDate)}</Field>
              <Field label="Pools">{vehicle.pools.length ? vehicle.pools.join(", ") : "—"}</Field>
              <Field label="NAICS codes">{vehicle.naicsCodes.length ? vehicle.naicsCodes.join(", ") : "—"}</Field>
            </dl>
            {vehicle.renewalActions || vehicle.notes ? (
              <div className="space-y-3 border-t border-slate-100 p-4">
                {vehicle.renewalActions ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Renewal actions</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{vehicle.renewalActions}</dd>
                  </div>
                ) : null}
                {vehicle.notes ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{vehicle.notes}</dd>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title={`Task-order pipeline (${vehicle.opportunities.length})`}
              description="Opportunities pursued on this vehicle."
            />
            {vehicle.opportunities.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No task orders linked to this vehicle.</p>
            ) : (
              <table className="gc-table">
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Agency</th>
                    <th>Stage</th>
                    <th className="text-right">Est. value</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.opportunities.map((o) => (
                    <tr key={o.id}>
                      <td className="max-w-[220px]">
                        <Link href={`/opportunities/${o.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                          {o.internalName}
                        </Link>
                      </td>
                      <td className="max-w-[140px] truncate text-slate-500">{o.agency?.name?.replace("[DEMO] ", "") ?? "—"}</td>
                      <td><StatusPill map={STAGE_STYLES} value={o.stage} /></td>
                      <td className="text-right tabular-nums">{formatCurrency(o.estimatedValue ? toNumber(o.estimatedValue) : null)}</td>
                      <td className="whitespace-nowrap text-slate-500">{formatDate(o.proposalDeadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Status" />
            <div className="space-y-3 p-4">
              <Field label="Status"><StatusPill map={VEHICLE_STATUS_STYLES} value={vehicle.status} /></Field>
              <Field label="Ceiling">{formatCurrency(vehicle.ceiling ? toNumber(vehicle.ceiling) : null)}</Field>
              <Field label="Task orders">{vehicle.opportunities.length}</Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
