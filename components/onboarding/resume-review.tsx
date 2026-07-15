"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, FileText, Info, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import { CLEARANCE_LEVELS } from "@/lib/ui/enums";
import { cn } from "@/lib/ui/cn";
import {
  applyProposalAction,
  parseResumeAction,
  type FormState,
  type ParseState,
} from "@/app/(app)/onboarding/actions";
import type { ResumeProposal } from "@/lib/resume";

/** Mirrors ACCEPTED_RESUME_TYPES; duplicated as a string so the file picker
 * hint doesn't drag the server-side extractor into the browser bundle. */
const ACCEPT = ".pdf,.docx,.txt,.md";

/** Rows carry an `include` flag so unchecking is a rejection, not a delete —
 * the member can change their mind before saving without re-parsing. */
type Row<T> = T & { include: boolean };

function withInclude<T>(rows: T[]): Row<T>[] {
  return rows.map((r) => ({ ...r, include: true }));
}

function SourceBadge({ source }: { source: string }) {
  if (source === "manual") return null;
  const isAI = source === "ai";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1",
        isAI
          ? "bg-violet-50 text-violet-700 ring-violet-200"
          : "bg-slate-50 text-slate-600 ring-slate-200",
      )}
      title={
        isAI
          ? "Extracted by AI from your resume. Check it before saving."
          : "Matched directly from your resume text."
      }
    >
      {isAI ? <Sparkles className="h-2.5 w-2.5" /> : null}
      {isAI ? "AI" : "Matched"}
    </span>
  );
}

function SubmitButton({ children, ...rest }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...rest}>
      {pending ? "Working…" : children}
    </Button>
  );
}

/** Step 1 — upload. */
function UploadStep({
  state,
  formAction,
}: {
  state: ParseState;
  formAction: (payload: FormData) => void;
}) {
  const [filename, setFilename] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader
        title="Upload your resume"
        description="We read it, pull out what we can, and show you the result to check. Nothing is saved until you confirm."
      />
      <CardBody>
        <form action={formAction} className="space-y-4">
          <label
            htmlFor="resume"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/40"
          >
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              {filename ?? "Choose a file"}
            </span>
            <span className="text-xs text-slate-500">PDF, Word (.docx), or plain text — up to 5MB</span>
            <input
              id="resume"
              name="resume"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => setFilename(e.target.files?.[0]?.name ?? null)}
            />
          </label>

          {/* This promise is load-bearing: the parse action holds the bytes in
              memory only and never calls a StorageAdapter. Don't soften the
              wording without changing the behaviour first. */}
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              <strong>Your resume file is not stored.</strong> It&apos;s read once to pull out your
              details, then discarded. Only the fields you confirm on the next screen are saved.
              Resume text is sent to Anthropic&apos;s API for parsing.
            </p>
          </div>

          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton>Read my resume</SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/** Step 2 — review and confirm. */
function ReviewStep({
  proposal,
  onStartOver,
}: {
  proposal: ResumeProposal;
  onStartOver: () => void;
}) {
  const [headline, setHeadline] = useState(proposal.headline ?? "");
  const [summary, setSummary] = useState(proposal.summary ?? "");
  const [laborCategory, setLaborCategory] = useState(proposal.laborCategory ?? "");
  const [yearsExperience, setYearsExperience] = useState(
    proposal.yearsExperience != null ? String(proposal.yearsExperience) : "",
  );
  const [clearanceLevel, setClearanceLevel] = useState(proposal.clearance.level);
  const [skills, setSkills] = useState(() => withInclude(proposal.skills));
  const [certifications, setCertifications] = useState(() => withInclude(proposal.certifications));
  const [education, setEducation] = useState(() => withInclude(proposal.education));
  const [experience, setExperience] = useState(() => withInclude(proposal.experience));

  const [state, formAction] = useFormState<FormState, FormData>(applyProposalAction, {
    ok: false,
  });

  // Only included rows are serialised — an excluded row never reaches the
  // server, so rejecting a bad extraction actually removes it.
  const payload = useMemo(() => {
    const strip = <T extends { include: boolean }>(rows: T[]) =>
      rows.filter((r) => r.include).map(({ include: _include, ...rest }) => rest);

    return JSON.stringify({
      headline: headline.trim(),
      summary: summary.trim(),
      laborCategory: laborCategory.trim(),
      yearsExperience: yearsExperience.trim(),
      clearanceLevel,
      skills: strip(skills),
      certifications: strip(certifications),
      education: strip(education),
      experience: strip(experience),
      resumeSourceFilename: proposal.meta.filename,
      resumeParseModel: proposal.meta.model ?? "",
    });
  }, [
    headline,
    summary,
    laborCategory,
    yearsExperience,
    clearanceLevel,
    skills,
    certifications,
    education,
    experience,
    proposal.meta.filename,
    proposal.meta.model,
  ]);

  const toggle = <T,>(
    setter: React.Dispatch<React.SetStateAction<Row<T>[]>>,
    index: number,
  ) => setter((rows) => rows.map((r, i) => (i === index ? { ...r, include: !r.include } : r)));

  const includedCount =
    skills.filter((s) => s.include).length +
    certifications.filter((c) => c.include).length +
    education.filter((e) => e.include).length +
    experience.filter((e) => e.include).length;

  if (state.ok) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800">Profile saved</h3>
          <p className="max-w-md text-xs text-slate-500">
            Your resume file was discarded — only the details you confirmed above were saved.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="payload" value={payload} />

      {proposal.meta.aiStatus === "failed" ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            {proposal.meta.aiMessage ??
              "Automatic parsing was unavailable, so we filled in only what we could match directly."}{" "}
            You can still type the rest in.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 ring-1 ring-blue-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Everything below was pulled from <strong>{proposal.meta.filename}</strong>. Check it —
            anything marked <em>AI</em> is a best guess. Uncheck what&apos;s wrong; edit what&apos;s close.
          </p>
        </div>
      )}

      <Card>
        <CardHeader title="About you" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Professional title" name="headline" className="sm:col-span-2">
            <TextInput
              name="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Cloud Architect"
            />
          </FormField>
          <FormField label="Professional summary" name="summary" className="sm:col-span-2">
            <TextArea
              name="summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Two or three sentences describing what you do."
            />
          </FormField>
          <FormField label="Labor category (LCAT)" name="laborCategory">
            <TextInput
              name="laborCategory"
              value={laborCategory}
              onChange={(e) => setLaborCategory(e.target.value)}
              placeholder="e.g. Systems Engineer III"
            />
          </FormField>
          <FormField label="Years of experience" name="yearsExperience">
            <TextInput
              name="yearsExperience"
              type="number"
              min={0}
              max={60}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Clearance"
          description="Read directly from your resume text — never guessed. Confirm or correct it."
        />
        <CardBody className="space-y-3">
          <FormField label="Clearance level" name="clearanceLevel">
            <Select
              name="clearanceLevel"
              options={CLEARANCE_LEVELS}
              value={clearanceLevel}
              onChange={(e) => setClearanceLevel(e.target.value as typeof clearanceLevel)}
            />
          </FormField>
          {proposal.clearance.evidence ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
              Found in your resume: “{proposal.clearance.evidence}”
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Skills"
          description={`${skills.filter((s) => s.include).length} of ${skills.length} selected`}
        />
        <CardBody>
          {skills.length === 0 ? (
            <p className="text-xs text-slate-500">No skills found. You can add them after saving.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <li key={`${skill.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => toggle(setSkills, i)}
                    aria-pressed={skill.include}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 transition",
                      skill.include
                        ? "bg-blue-50 text-blue-800 ring-blue-200"
                        : "bg-slate-50 text-slate-400 line-through ring-slate-200",
                    )}
                  >
                    {skill.name}
                    <SourceBadge source={skill.source} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Certifications" />
        <CardBody>
          {certifications.length === 0 ? (
            <p className="text-xs text-slate-500">None found.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {certifications.map((cert, i) => (
                <li key={`${cert.name}-${i}`} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={cert.include}
                    onChange={() => toggle(setCertifications, i)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Include ${cert.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-slate-800">{cert.name}</span>
                      <SourceBadge source={cert.source} />
                    </div>
                    {cert.issuer || cert.issuedOn ? (
                      <p className="text-xs text-slate-500">
                        {[cert.issuer, cert.issuedOn].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Experience"
          description="Federal engagements are what past-performance volumes are built from — check those carefully."
        />
        <CardBody>
          {experience.length === 0 ? (
            <p className="text-xs text-slate-500">None found.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {experience.map((exp, i) => (
                <li key={`${exp.organization}-${i}`} className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={exp.include}
                    onChange={() => toggle(setExperience, i)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    aria-label={`Include ${exp.organization}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {exp.role ? `${exp.role} · ` : ""}
                        {exp.organization}
                      </span>
                      {exp.isFederal ? (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                          Federal{exp.agency ? ` · ${exp.agency}` : ""}
                        </span>
                      ) : null}
                      <SourceBadge source={exp.source} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {[exp.startedOn, exp.endedOn ?? "Present"].filter(Boolean).join(" – ")}
                      {exp.contractName ? ` · ${exp.contractName}` : ""}
                    </p>
                    {exp.summary ? (
                      <p className="mt-1 text-xs text-slate-600">{exp.summary}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Education" />
        <CardBody>
          {education.length === 0 ? (
            <p className="text-xs text-slate-500">None found.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {education.map((edu, i) => (
                <li key={`${edu.institution}-${i}`} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={edu.include}
                    onChange={() => toggle(setEducation, i)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Include ${edu.institution}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-slate-800">
                        {[edu.degree, edu.field].filter(Boolean).join(" ")}
                        {edu.degree || edu.field ? " · " : ""}
                        {edu.institution}
                      </span>
                      <SourceBadge source={edu.source} />
                    </div>
                    {edu.completedOn ? (
                      <p className="text-xs text-slate-500">{edu.completedOn}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {proposal.capabilityHighlights.length > 0 ? (
        <Card>
          <CardHeader
            title="Capability statement highlights"
            description="Draft achievement bullets for your capability statement."
          />
          <CardBody>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
              {proposal.capabilityHighlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onStartOver}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Discard and start over
        </Button>
        <SubmitButton>Save {includedCount} confirmed details</SubmitButton>
      </div>
    </form>
  );
}

export function ResumeReview() {
  const [state, formAction] = useFormState<ParseState, FormData>(parseResumeAction, {
    ok: false,
  });
  const [discarded, setDiscarded] = useState(false);

  const proposal = discarded ? undefined : state.proposal;

  if (!proposal) {
    return (
      <div className="space-y-4">
        <UploadStep state={discarded ? { ok: false } : state} formAction={formAction} />
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <FileText className="h-3 w-3" />
          Prefer to type it in? You can fill in your profile manually below.
        </p>
      </div>
    );
  }

  return <ReviewStep proposal={proposal} onStartOver={() => setDiscarded(true)} />;
}
