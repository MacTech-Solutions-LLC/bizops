"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { REQUIREMENT_STATUS_STYLES } from "@/lib/ui/status";
import { cn } from "@/lib/ui/cn";
import { humanizeEnum } from "@/lib/ui/format";
import {
  missingResponseAlerts,
  requirementCoverage,
  unassignedAlerts,
} from "@/lib/services/proposal-metrics";
import {
  assignRequirementAction,
  saveRequirementAction,
  type FormState,
} from "@/app/(app)/proposals/[id]/actions";

export interface RequirementRow {
  id: string;
  refId: string;
  sourceSection: string | null;
  text: string;
  requirementType: string;
  mandatory: boolean;
  volumeId: string | null;
  responseSection: string | null;
  ownerId: string | null;
  status: string;
  evidence: string | null;
}

const STATUS_OPTIONS = Object.entries(REQUIREMENT_STATUS_STYLES).map(([value, s]) => ({
  value,
  label: s.label,
}));

const REQUIREMENT_TYPES = [
  "SHALL",
  "MUST",
  "WILL",
  "SHOULD",
  "INSTRUCTION",
  "EVALUATION_CRITERIA",
  "INFORMATIONAL",
].map((value) => ({ value, label: humanizeEnum(value) }));

export function ComplianceMatrix({
  proposalId,
  requirements,
  volumes,
  canManage,
  canExport,
}: {
  proposalId: string;
  requirements: RequirementRow[];
  volumes: Array<{ id: string; name: string }>;
  canManage: boolean;
  canExport: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [volumeFilter, setVolumeFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const volumeName = useMemo(
    () => new Map(volumes.map((v) => [v.id, v.name])),
    [volumes],
  );
  const volumeOptions = volumes.map((v) => ({ value: v.id, label: v.name }));

  const coverage = requirementCoverage(requirements);
  const unassignedIds = useMemo(
    () => new Set(unassignedAlerts(requirements).map((r) => r.id)),
    [requirements],
  );
  const missingIds = useMemo(
    () => new Set(missingResponseAlerts(requirements).map((r) => r.id)),
    [requirements],
  );

  const filtered = requirements.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (volumeFilter === "__none__" && r.volumeId) return false;
    if (volumeFilter && volumeFilter !== "__none__" && r.volumeId !== volumeFilter) return false;
    return true;
  });

  function assign(id: string, patch: { ownerId?: string; volumeId?: string; status?: string }) {
    setError(null);
    startTransition(async () => {
      const res = await assignRequirementAction(id, patch, proposalId);
      if (!res.ok) setError(res.error ?? "Could not update requirement");
    });
  }

  return (
    <div className="space-y-3">
      {/* Coverage summary */}
      <div className="gc-card flex flex-wrap items-center gap-4 p-3">
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Requirement coverage</span>
            <span className="tabular-nums">{coverage.coveragePercent}%</span>
          </div>
          <ProgressBar value={coverage.coveragePercent} className="mt-1" label="Requirement coverage" />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Stat label="Total" value={coverage.total} />
          <Stat label="Unassigned" value={coverage.unassigned} tone={coverage.unassigned > 0 ? "red" : undefined} />
          <Stat label="Assigned" value={coverage.assigned} />
          <Stat label="In review" value={coverage.inReview} />
          <Stat label="Complete" value={coverage.complete} tone="green" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 w-auto"
        />
        <Select
          aria-label="Filter by volume"
          options={[{ value: "__none__", label: "— Unassigned —" }, ...volumeOptions]}
          placeholder="All volumes"
          value={volumeFilter}
          onChange={(e) => setVolumeFilter(e.target.value)}
          className="h-9 w-auto"
        />
        <div className="ml-auto flex items-center gap-2">
          {canExport && (
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/proposals/${proposalId}/requirements/export`}>
                <Download className="h-4 w-4" /> CSV
              </a>
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setShowAdd((s) => !s)}>
              <Plus className="h-4 w-4" /> Requirement
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {canManage && showAdd ? (
        <AddRequirementForm
          proposalId={proposalId}
          volumeOptions={volumeOptions}
          onDone={() => setShowAdd(false)}
        />
      ) : null}

      {requirements.length === 0 ? (
        <EmptyState
          title="No requirements yet"
          description="Add requirements from the solicitation's Section L / M to build the compliance matrix."
        />
      ) : (
        <div className="gc-card overflow-hidden">
          <div className={cn("overflow-x-auto", pending && "opacity-60")}>
            <table className="gc-table">
              <thead>
                <tr>
                  <th>Req ID</th>
                  <th>Source</th>
                  <th className="min-w-[280px]">Requirement</th>
                  <th>Type</th>
                  <th>Mand.</th>
                  <th>Volume</th>
                  <th>Response §</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isUnassigned = unassignedIds.has(r.id);
                  const isMissing = missingIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        isUnassigned && "bg-red-50/60",
                        !isUnassigned && isMissing && "bg-amber-50/60",
                      )}
                    >
                      <td className="whitespace-nowrap font-medium text-slate-700">{r.refId}</td>
                      <td className="whitespace-nowrap text-slate-500">{r.sourceSection ?? "—"}</td>
                      <td className="max-w-[360px]">
                        <span className="line-clamp-2 text-slate-700" title={r.text}>
                          {r.text}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-slate-500">
                        {humanizeEnum(r.requirementType)}
                      </td>
                      <td className="text-center">
                        {r.mandatory ? (
                          <span className="text-xs font-semibold text-slate-700">M</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        {canManage ? (
                          <select
                            aria-label={`Volume for ${r.refId}`}
                            value={r.volumeId ?? ""}
                            disabled={pending}
                            onChange={(e) => assign(r.id, { volumeId: e.target.value })}
                            className="h-8 max-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-xs"
                          >
                            <option value="">— none —</option>
                            {volumeOptions.map((v) => (
                              <option key={v.value} value={v.value}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-500">
                            {r.volumeId ? volumeName.get(r.volumeId) ?? "—" : "—"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-slate-500">{r.responseSection ?? "—"}</td>
                      <td>
                        {canManage ? (
                          <input
                            aria-label={`Owner for ${r.refId}`}
                            defaultValue={r.ownerId ?? ""}
                            disabled={pending}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.ownerId ?? "")) assign(r.id, { ownerId: val });
                            }}
                            placeholder="—"
                            className="h-8 w-24 rounded-md border border-slate-200 bg-white px-2 text-xs"
                          />
                        ) : (
                          <span className="text-slate-500">{r.ownerId ?? "—"}</span>
                        )}
                      </td>
                      <td>
                        {canManage ? (
                          <select
                            aria-label={`Status for ${r.refId}`}
                            value={r.status}
                            disabled={pending}
                            onChange={(e) => assign(r.id, { status: e.target.value })}
                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <StatusPill map={REQUIREMENT_STATUS_STYLES} value={r.status} />
                        )}
                      </td>
                      <td className="max-w-[160px] truncate text-slate-500" title={r.evidence ?? ""}>
                        {r.evidence ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              No requirements match these filters.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "red" | "green" }) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "text-base font-semibold tabular-nums text-slate-800",
          tone === "red" && "text-red-600",
          tone === "green" && "text-green-600",
        )}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function AddRequirementForm({
  proposalId,
  volumeOptions,
  onDone,
}: {
  proposalId: string;
  volumeOptions: Array<{ value: string; label: string }>;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(saveRequirementAction, { ok: false });
  const err = (field: string) => state.issues?.[field];
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="gc-card space-y-3 p-4">
      <input type="hidden" name="proposalId" value={proposalId} />
      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Requirement ID" name="refId" required error={err("refId")}>
          <TextInput name="refId" placeholder="L.3.2" required />
        </FormField>
        <FormField label="Source section" name="sourceSection">
          <TextInput name="sourceSection" placeholder="Section L" />
        </FormField>
        <FormField label="Type" name="requirementType">
          <Select name="requirementType" options={REQUIREMENT_TYPES} defaultValue="SHALL" />
        </FormField>
        <FormField label="Response section" name="responseSection">
          <TextInput name="responseSection" />
        </FormField>
        <FormField label="Volume" name="volumeId">
          <Select name="volumeId" options={volumeOptions} placeholder="— none —" />
        </FormField>
        <FormField label="Owner (Hub user id)" name="ownerId">
          <TextInput name="ownerId" />
        </FormField>
        <FormField label="Mandatory" name="mandatory">
          <label className="flex h-9 items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="mandatory" value="true" defaultChecked /> Mandatory
          </label>
        </FormField>
      </div>
      <FormField label="Requirement text" name="text" required error={err("text")}>
        <TextArea name="text" rows={2} required />
      </FormField>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <AddSubmit />
      </div>
    </form>
  );
}

function AddSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Adding…" : "Add requirement"}
    </Button>
  );
}
