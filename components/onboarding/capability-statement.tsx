"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField, TextArea, TextInput } from "@/components/ui/form";
import {
  generateStatementAction,
  saveStatementAction,
  type FormState,
  type StatementDraftState,
} from "@/app/(app)/onboarding/actions";
import type { StatementFacts } from "@/lib/capability-statement/assemble";
import type { StoredStatementView } from "@/lib/services/capability-statement";
import { serialiseStatementPayload } from "@/lib/capability-statement/payload";
import { ErrorBanner, SubmitButton } from "./form-bits";

/**
 * The "Capability Statement" section of My Profile.
 *
 * The document the profile feeds. Three states over one stored record: none yet
 * (offer to draft it), reviewing a fresh AI draft, and viewing a saved one. The
 * narrative is AI-drafted and member-confirmed; the hard facts beside it
 * (company identity, NAICS, clearance, certifications, past performance) are
 * assembled live from confirmed sources on the server and rendered read-only
 * here — this component never lets a fact be typed onto the statement.
 */

type Mode = "view" | "review";

/** An editable bullet list — add, edit, remove. Blank rows are allowed while
 * editing; the schema drops them on save. */
function BulletEditor({
  label,
  hint,
  rows,
  setRows,
  placeholder,
}: {
  label: string;
  hint?: string;
  rows: string[];
  setRows: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-sm font-medium text-slate-700">{label}</h4>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center gap-2">
            <TextInput
              value={row}
              placeholder={placeholder}
              onChange={(e) => setRows(rows.map((r, j) => (j === i ? e.target.value : r)))}
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={`Remove ${label} item ${i + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setRows([...rows, ""])}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add {label.toLowerCase()}
      </button>
    </div>
  );
}

/** The read-only hard-facts block, shown in both review and view modes so the
 * member always sees the whole statement, not just the part they edit. */
function FactsBlock({ facts, fromSuite }: { facts: StatementFacts; fromSuite: boolean }) {
  return (
    <div className="space-y-4">
      {facts.company ? (
        <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-900">
            {facts.company.legalName}
            {facts.company.dba ? (
              <span className="font-normal text-slate-500"> (dba {facts.company.dba})</span>
            ) : null}
          </p>
          <p className="text-xs text-slate-500">
            {[
              facts.company.cageCode ? `CAGE ${facts.company.cageCode}` : null,
              facts.company.uei ? `UEI ${facts.company.uei}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Add CAGE / UEI in Settings → Company profile."}
          </p>
        </div>
      ) : null}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {facts.laborCategory ? (
          <div>
            <dt className="text-xs font-medium text-slate-400">Labor category</dt>
            <dd className="text-sm text-slate-800">{facts.laborCategory}</dd>
          </div>
        ) : null}
        {facts.yearsExperience != null ? (
          <div>
            <dt className="text-xs font-medium text-slate-400">Experience</dt>
            <dd className="text-sm text-slate-800">{facts.yearsExperience} years</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-medium text-slate-400">Clearance</dt>
          <dd className="text-sm text-slate-800">{facts.clearanceLabel}</dd>
        </div>
      </dl>

      {facts.naics.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            NAICS codes
          </h4>
          <ul className="space-y-1">
            {facts.naics.map((n) => (
              <li key={n.code} className="flex items-baseline gap-2 text-sm">
                <span className="font-mono text-xs text-slate-500">{n.code}</span>
                <span className="text-slate-700">{n.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {facts.certifications.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Certifications
          </h4>
          <ul className="flex flex-wrap gap-2">
            {facts.certifications.map((c, i) => (
              <li
                key={i}
                className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
              >
                {c.name}
                {c.issuer ? <span className="text-slate-400"> · {c.issuer}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {facts.pastPerformance.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Past performance
          </h4>
          <ul className="divide-y divide-slate-100">
            {facts.pastPerformance.map((p, i) => (
              <li key={i} className="py-1.5">
                <p className="text-sm text-slate-800">
                  {[p.role, p.organization].filter(Boolean).join(" · ")}
                  {p.agency ? (
                    <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                      {p.agency}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {[p.period, p.contractName].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="flex items-start gap-1.5 text-xs text-slate-400">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        These are pulled live from your confirmed profile
        {facts.company ? " and company settings" : ""}
        {fromSuite ? ", and synced from your MacTech suite profile" : ""}. Edit them where they
        live — they can&apos;t be changed here.
      </p>
    </div>
  );
}

/** Review/edit the narrative and confirm. Seeded either from a fresh draft or
 * from the saved statement. */
function StatementReview({
  initial,
  facts,
  generateModel,
  fromSuite,
  onCancel,
}: {
  initial: {
    professionalSummary: string;
    coreCompetencies: string[];
    differentiators: string[];
    pastPerformanceHighlights: string[];
  };
  facts: StatementFacts;
  generateModel: string | null;
  fromSuite: boolean;
  onCancel: () => void;
}) {
  const [summary, setSummary] = useState(initial.professionalSummary);
  const [competencies, setCompetencies] = useState(initial.coreCompetencies);
  const [differentiators, setDifferentiators] = useState(initial.differentiators);
  const [pastPerformance, setPastPerformance] = useState(initial.pastPerformanceHighlights);

  const [state, formAction] = useFormState<FormState, FormData>(saveStatementAction, { ok: false });

  // Built by the pure serialiser tested against the save schema — do not inline.
  const payload = useMemo(
    () =>
      serialiseStatementPayload({
        professionalSummary: summary,
        coreCompetencies: competencies,
        differentiators,
        pastPerformanceHighlights: pastPerformance,
        generateModel,
        syncedFromSuite: fromSuite,
      }),
    [summary, competencies, differentiators, pastPerformance, generateModel, fromSuite],
  );

  if (state.ok) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800">Capability statement saved</h3>
          <p className="max-w-md text-xs text-slate-500">
            It&apos;s built from the details you confirmed. Update it any time your profile changes.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="payload" value={payload} />

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 ring-1 ring-blue-200">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {generateModel
            ? "This draft was written by AI from your confirmed profile — it never adds facts you didn't provide. "
            : "This draft was seeded from your confirmed profile. "}
          Edit anything, then save. Nothing here is stored until you do.
        </p>
      </div>

      <Card>
        <CardHeader title="Professional summary" />
        <CardBody>
          <FormField label="Summary" name="professionalSummary">
            <TextArea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Two or three sentences a customer reads first."
            />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Core competencies & differentiators" />
        <CardBody className="space-y-5">
          <BulletEditor
            label="Core competencies"
            hint="The capability areas a customer would search for."
            rows={competencies}
            setRows={setCompetencies}
            placeholder="e.g. RMF / ATO package development"
          />
          <BulletEditor
            label="Differentiators"
            hint="What sets you apart — certifications, clearance, customers served."
            rows={differentiators}
            setRows={setDifferentiators}
            placeholder="e.g. Active TS/SCI clearance"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Past-performance highlights"
          description="One line per engagement, in your words."
        />
        <CardBody>
          <BulletEditor
            label="Highlights"
            rows={pastPerformance}
            setRows={setPastPerformance}
            placeholder="e.g. Led the ATO for a USSF ground system"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Included from your profile"
          description="Facts drawn straight from confirmed sources."
        />
        <CardBody>
          <FactsBlock facts={facts} fromSuite={fromSuite} />
        </CardBody>
      </Card>

      <ErrorBanner state={state} />

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Discard
        </Button>
        <SubmitButton>Save capability statement</SubmitButton>
      </div>
    </form>
  );
}

/** Read-only view of a saved statement. Rendered inside the generate `<form>`,
 * so the regenerate button is a plain submit reflecting its pending state. */
function StatementView({
  statement,
  facts,
  onEdit,
}: {
  statement: StoredStatementView;
  facts: StatementFacts;
  onEdit: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit statement
        </Button>
        <Button type="submit" variant="ghost" disabled={pending}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Drafting…" : "Regenerate with AI"}
        </Button>
      </div>

      <Card>
        <CardHeader title="Capability statement" />
        <CardBody className="space-y-5">
          {statement.professionalSummary ? (
            <p className="whitespace-pre-line text-sm text-slate-700">
              {statement.professionalSummary}
            </p>
          ) : null}

          {statement.coreCompetencies.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Core competencies
              </h4>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {statement.coreCompetencies.map((c, i) => (
                  <li key={i} className="flex items-baseline gap-1.5 text-sm text-slate-700">
                    <span className="text-blue-400">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {statement.differentiators.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Differentiators
              </h4>
              <ul className="space-y-1">
                {statement.differentiators.map((d, i) => (
                  <li key={i} className="flex items-baseline gap-1.5 text-sm text-slate-700">
                    <span className="text-blue-400">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {statement.pastPerformanceHighlights.length > 0 ? (
            <div>
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Past-performance highlights
              </h4>
              <ul className="space-y-1">
                {statement.pastPerformanceHighlights.map((p, i) => (
                  <li key={i} className="flex items-baseline gap-1.5 text-sm text-slate-700">
                    <span className="text-blue-400">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Included from your profile" />
        <CardBody>
          <FactsBlock facts={facts} fromSuite={statement.hubSyncedAt != null} />
        </CardBody>
      </Card>
    </div>
  );
}

export function CapabilityStatementSection({
  statement,
  facts,
}: {
  statement: StoredStatementView | null;
  facts: StatementFacts;
}) {
  const [genState, generate] = useFormState<StatementDraftState, FormData>(generateStatementAction, {
    ok: false,
  });
  // "review" once a draft arrives or the member chooses to edit; otherwise the
  // saved view (or the empty CTA when there's nothing saved yet).
  const [mode, setMode] = useState<Mode | null>(null);

  const draft = genState.draft;

  // A fresh draft moves us into review with the AI/seed content.
  if (draft && mode !== "view") {
    return (
      <StatementReview
        initial={{
          professionalSummary: draft.draft.professionalSummary ?? "",
          coreCompetencies: draft.draft.coreCompetencies,
          differentiators: draft.draft.differentiators,
          pastPerformanceHighlights: draft.draft.pastPerformanceHighlights,
        }}
        facts={draft.facts}
        generateModel={draft.meta.model}
        fromSuite={draft.meta.fromSuite}
        onCancel={() => setMode("view")}
      />
    );
  }

  // Editing an existing saved statement by hand (no fresh draft).
  if (mode === "review" && statement) {
    return (
      <StatementReview
        initial={{
          professionalSummary: statement.professionalSummary ?? "",
          coreCompetencies: statement.coreCompetencies,
          differentiators: statement.differentiators,
          pastPerformanceHighlights: statement.pastPerformanceHighlights,
        }}
        facts={facts}
        generateModel={statement.generateModel}
        fromSuite={statement.hubSyncedAt != null}
        onCancel={() => setMode("view")}
      />
    );
  }

  if (statement) {
    return (
      <form action={generate}>
        {genState.error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
            {genState.error}
          </p>
        ) : null}
        <StatementView statement={statement} facts={facts} onEdit={() => setMode("review")} />
      </form>
    );
  }

  // Nothing saved yet — the empty-state CTA.
  return (
    <Card>
      <CardHeader
        title="Capability statement"
        description="Turn your profile into a customer-facing capability statement. We draft it from what you've confirmed — including your MacTech suite profile — and you edit and confirm every line before it's saved."
      />
      <CardBody>
        <form action={generate}>
          {genState.error ? (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
              {genState.error}
            </p>
          ) : null}
          <GenerateButton label="Draft my capability statement" />
        </form>
      </CardBody>
    </Card>
  );
}

/** Generate button that reflects the enclosing form's pending state. */
function GenerateButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
      {pending ? "Drafting…" : label}
    </Button>
  );
}
