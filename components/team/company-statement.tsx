"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Info, Pencil, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulletEditor } from "@/components/ui/bullet-editor";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField, TextArea } from "@/components/ui/form";
import {
  generateCompanyStatementAction,
  saveCompanyStatementAction,
  type CompanyDraftState,
  type FormState,
} from "@/app/(app)/team/company-statement/actions";
import type { CompanyStatementFacts } from "@/lib/company-statement/assemble";
import type { StoredCompanyStatementView } from "@/lib/services/company-statement";
import { serialiseCompanyStatementPayload } from "@/lib/company-statement/payload";
import { ErrorBanner, SubmitButton } from "@/components/onboarding/form-bits";

/**
 * The company-wide Capability Statement screen.
 *
 * Same three states as the member statement over one stored record — none yet
 * (offer to draft), reviewing a fresh AI draft, viewing the saved one — with
 * one difference: only managers generate, edit, and confirm. Everyone else
 * gets the read-only view. The aggregated hard facts beside the narrative are
 * assembled live from published member profiles on the server and rendered
 * read-only here.
 */

type Mode = "view" | "review";

/** The live aggregated-facts block — team-wide, no individual names. */
function CompanyFactsBlock({ facts }: { facts: CompanyStatementFacts }) {
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
        <div>
          <dt className="text-xs font-medium text-slate-400">Published members</dt>
          <dd className="text-sm text-slate-800">{facts.teamSize}</dd>
        </div>
        {facts.laborCategories.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400">Labor categories</dt>
            <dd className="text-sm text-slate-800">{facts.laborCategories.join(" · ")}</dd>
          </div>
        ) : null}
      </dl>

      {facts.clearanceMix.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Clearance mix
          </h4>
          <ul className="flex flex-wrap gap-2">
            {facts.clearanceMix.map((c) => (
              <li
                key={c.label}
                className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
              >
                {c.count} × {c.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {facts.naics.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            NAICS coverage
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
            Team certifications
          </h4>
          <ul className="flex flex-wrap gap-2">
            {facts.certifications.map((c) => (
              <li
                key={c.name}
                className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
              >
                {c.name}
                {c.count > 1 ? <span className="text-slate-400"> × {c.count}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {facts.pastPerformance.length > 0 ? (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Federal past performance
          </h4>
          <ul className="divide-y divide-slate-100">
            {facts.pastPerformance.map((p, i) => (
              <li key={i} className="py-1.5">
                <p className="text-sm text-slate-800">
                  {p.organization}
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
        These aggregates are pulled live from every published member profile and the company
        settings. They update as members publish — they can&apos;t be edited here.
      </p>
    </div>
  );
}

/** Review/edit the narrative and confirm. Managers only — the page doesn't
 * render this for viewers. */
function CompanyStatementReview({
  initial,
  facts,
  generateModel,
  onCancel,
}: {
  initial: {
    professionalSummary: string;
    coreCompetencies: string[];
    differentiators: string[];
    pastPerformanceHighlights: string[];
  };
  facts: CompanyStatementFacts;
  generateModel: string | null;
  onCancel: () => void;
}) {
  const [summary, setSummary] = useState(initial.professionalSummary);
  const [competencies, setCompetencies] = useState(initial.coreCompetencies);
  const [differentiators, setDifferentiators] = useState(initial.differentiators);
  const [pastPerformance, setPastPerformance] = useState(initial.pastPerformanceHighlights);

  const [state, formAction] = useFormState<FormState, FormData>(saveCompanyStatementAction, {
    ok: false,
  });

  const payload = useMemo(
    () =>
      serialiseCompanyStatementPayload({
        professionalSummary: summary,
        coreCompetencies: competencies,
        differentiators,
        pastPerformanceHighlights: pastPerformance,
        generateModel,
      }),
    [summary, competencies, differentiators, pastPerformance, generateModel],
  );

  if (state.ok) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800">Company statement saved</h3>
          <p className="max-w-md text-xs text-slate-500">
            It&apos;s built from what the team confirmed. Regenerate it as more members publish
            their profiles and statements.
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
            ? "This draft was synthesised by AI from the team's confirmed profiles and statements — it never adds facts nobody provided. "
            : "This draft was seeded from the team's confirmed content. "}
          Edit anything, then save. Nothing here is stored until you do.
        </p>
      </div>

      <Card>
        <CardHeader title="Company summary" />
        <CardBody>
          <FormField label="Summary" name="professionalSummary">
            <TextArea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Two to four sentences a customer reads first about MacTech."
            />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Core competencies & differentiators" />
        <CardBody className="space-y-5">
          <BulletEditor
            label="Core competencies"
            hint="The company capability areas a customer would search for."
            rows={competencies}
            setRows={setCompetencies}
            placeholder="e.g. RMF / ATO package development"
          />
          <BulletEditor
            label="Differentiators"
            hint="What sets the company apart — team certifications, clearance depth, customers served."
            rows={differentiators}
            setRows={setDifferentiators}
            placeholder="e.g. 6 cleared engineers on staff"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Past-performance highlights"
          description="One line per engagement, de-duplicated across the team."
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
          title="Included from the team"
          description="Aggregates drawn straight from published profiles."
        />
        <CardBody>
          <CompanyFactsBlock facts={facts} />
        </CardBody>
      </Card>

      <ErrorBanner state={state} />

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Discard
        </Button>
        <SubmitButton>Save company statement</SubmitButton>
      </div>
    </form>
  );
}

/** Read-only view of the saved statement. Rendered inside the generate form
 * for managers so the regenerate button reflects pending state. */
function CompanyStatementView({
  statement,
  facts,
  canManage,
  onEdit,
}: {
  statement: StoredCompanyStatementView;
  facts: CompanyStatementFacts;
  canManage: boolean;
  onEdit: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="space-y-4">
      {canManage ? (
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
      ) : null}

      <Card>
        <CardHeader
          title="Company capability statement"
          description={
            statement.confirmedAt
              ? `Confirmed ${new Date(statement.confirmedAt).toLocaleDateString()} · built from ${statement.sourceHubUserIds.length} published member${statement.sourceHubUserIds.length === 1 ? "" : "s"}`
              : undefined
          }
        />
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
        <CardHeader title="Included from the team" />
        <CardBody>
          <CompanyFactsBlock facts={facts} />
        </CardBody>
      </Card>
    </div>
  );
}

export function CompanyStatementSection({
  statement,
  facts,
  canManage,
}: {
  statement: StoredCompanyStatementView | null;
  facts: CompanyStatementFacts;
  canManage: boolean;
}) {
  const [genState, generate] = useFormState<CompanyDraftState, FormData>(
    generateCompanyStatementAction,
    { ok: false },
  );
  const [mode, setMode] = useState<Mode | null>(null);

  const draft = genState.draft;

  // A fresh draft moves a manager into review with the AI/seed content.
  if (canManage && draft && mode !== "view") {
    return (
      <CompanyStatementReview
        initial={{
          professionalSummary: draft.draft.professionalSummary ?? "",
          coreCompetencies: draft.draft.coreCompetencies,
          differentiators: draft.draft.differentiators,
          pastPerformanceHighlights: draft.draft.pastPerformanceHighlights,
        }}
        facts={draft.facts}
        generateModel={draft.meta.model}
        onCancel={() => setMode("view")}
      />
    );
  }

  // Hand-editing the saved statement (no fresh draft).
  if (canManage && mode === "review" && statement) {
    return (
      <CompanyStatementReview
        initial={{
          professionalSummary: statement.professionalSummary ?? "",
          coreCompetencies: statement.coreCompetencies,
          differentiators: statement.differentiators,
          pastPerformanceHighlights: statement.pastPerformanceHighlights,
        }}
        facts={facts}
        generateModel={statement.generateModel}
        onCancel={() => setMode("view")}
      />
    );
  }

  if (statement) {
    const view = (
      <CompanyStatementView
        statement={statement}
        facts={facts}
        canManage={canManage}
        onEdit={() => setMode("review")}
      />
    );
    if (!canManage) return view;
    return (
      <form action={generate}>
        {genState.error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
            {genState.error}
          </p>
        ) : null}
        {view}
      </form>
    );
  }

  // Nothing saved yet.
  return (
    <Card>
      <CardHeader
        title="Company capability statement"
        description="One statement for the whole company, built from the best of every published member profile and confirmed capability statement. AI drafts it; a manager reviews and confirms every line before it's saved."
      />
      <CardBody>
        {canManage ? (
          <form action={generate}>
            {genState.error ? (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
                {genState.error}
              </p>
            ) : null}
            <GenerateButton label="Draft the company statement" />
          </form>
        ) : (
          <p className="text-sm text-slate-500">
            No company statement has been confirmed yet. A manager can draft one once members
            publish their profiles.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function GenerateButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
      {pending ? "Drafting…" : label}
    </Button>
  );
}
