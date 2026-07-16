"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import { CLEARANCE_LEVELS } from "@/lib/ui/enums";
import { candidateNaics, naicsTitle, MAX_MEMBER_NAICS } from "@/lib/naics";
import { saveProfileAction, type FormState } from "@/app/(app)/onboarding/actions";
import {
  serialiseProfilePayload,
  toEditorState,
  type EditableCertification,
  type EditableEducation,
  type EditableExperience,
  type EditableSkill,
  type ProfileEditorState,
  type StoredProfile,
} from "@/lib/profile/edit-payload";
import { ErrorBanner, SourceBadge, SubmitButton, fieldError } from "./form-bits";

/**
 * The manual profile editor — the "type it in yourself" half of onboarding.
 *
 * Every section is a full replacement on save, matching the resume path: a row
 * removed here is absent from the payload and therefore deleted. Rows keep the
 * `source` they were created with so a member can still see which entries came
 * from an AI extraction after they've been saved.
 */

/** The picker's options. A <select> rather than a text field on purpose: a
 * member typing a NAICS code is exactly the invented-code problem the AI path
 * is built to avoid, so the UI doesn't offer the chance. */
const NAICS_OPTIONS = [
  { value: "", label: "Select a NAICS code…" },
  ...candidateNaics().map((c) => ({ value: c.code, label: `${c.code} — ${c.title}` })),
];

const PROFICIENCY_OPTIONS = [
  { value: "familiar", label: "Familiar" },
  { value: "proficient", label: "Proficient" },
  { value: "expert", label: "Expert" },
];

const emptySkill = (): EditableSkill => ({
  name: "",
  category: null,
  proficiency: "proficient",
  yearsExperience: "",
  source: "manual",
  confirmed: true,
});

const emptyCertification = (): EditableCertification => ({
  name: "",
  issuer: "",
  identifier: null,
  issuedOn: "",
  expiresOn: "",
  source: "manual",
  confirmed: true,
});

const emptyEducation = (): EditableEducation => ({
  institution: "",
  degree: "",
  field: "",
  completedOn: "",
  source: "manual",
  confirmed: true,
});

const emptyExperience = (): EditableExperience => ({
  organization: "",
  role: "",
  startedOn: "",
  endedOn: "",
  summary: "",
  isFederal: false,
  agency: "",
  contractName: "",
  source: "manual",
  confirmed: true,
});

/** A section of repeated rows, with its own add/remove controls. */
function RowSection<T>({
  title,
  description,
  rows,
  onAdd,
  onRemove,
  addLabel,
  emptyText,
  children,
}: {
  title: string;
  description?: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel: string;
  emptyText: string;
  children: (row: T, index: number) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="space-y-3">
        {rows.length === 0 ? <p className="text-xs text-slate-500">{emptyText}</p> : null}
        {rows.map((row, i) => (
          <div key={i} className="relative rounded-lg bg-slate-50/60 p-3 ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${title} item ${i + 1}`}
              className="absolute right-2 top-2 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {children(row, i)}
          </div>
        ))}
        <Button type="button" variant="ghost" onClick={onAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </CardBody>
    </Card>
  );
}

export function ProfileEditor({
  profile,
  onCancel,
}: {
  profile: StoredProfile;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProfileEditorState>(() => toEditorState(profile));
  const [state, formAction] = useFormState<FormState, FormData>(saveProfileAction, { ok: false });

  const payload = useMemo(() => serialiseProfilePayload(draft), [draft]);

  const set = <K extends keyof ProfileEditorState>(key: K, value: ProfileEditorState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /** Edit one field of one row, leaving the rest of the section untouched. */
  const editRow = <K extends "skills" | "certifications" | "education" | "experience">(
    section: K,
    index: number,
    patch: Partial<ProfileEditorState[K][number]>,
  ) =>
    setDraft((d) => ({
      ...d,
      [section]: d[section].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));

  const addRow = <K extends "skills" | "certifications" | "education" | "experience">(
    section: K,
    row: ProfileEditorState[K][number],
  ) => setDraft((d) => ({ ...d, [section]: [...d[section], row] }));

  const removeRow = (
    section: "skills" | "certifications" | "education" | "experience",
    index: number,
  ) =>
    setDraft((d) => ({
      ...d,
      [section]: d[section].filter((_, i) => i !== index),
    }));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="payload" value={payload} />

      <Card>
        <CardHeader title="About you" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Professional title"
            name="headline"
            className="sm:col-span-2"
            error={fieldError(state.issues, "headline")}
          >
            <TextInput
              id="headline"
              value={draft.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="e.g. Senior Cloud Architect"
            />
          </FormField>
          <FormField
            label="Professional summary"
            name="summary"
            className="sm:col-span-2"
            error={fieldError(state.issues, "summary")}
          >
            <TextArea
              rows={4}
              id="summary"
              value={draft.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="Two or three sentences describing what you do."
            />
          </FormField>
          <FormField
            label="Labor category (LCAT)"
            name="laborCategory"
            error={fieldError(state.issues, "laborCategory")}
          >
            <TextInput
              id="laborCategory"
              value={draft.laborCategory}
              onChange={(e) => set("laborCategory", e.target.value)}
              placeholder="e.g. Systems Engineer III"
            />
          </FormField>
          <FormField
            label="Years of experience"
            name="yearsExperience"
            error={fieldError(state.issues, "yearsExperience")}
          >
            <TextInput
              type="number"
              min={0}
              max={60}
              id="yearsExperience"
              value={draft.yearsExperience}
              onChange={(e) => set("yearsExperience", e.target.value)}
            />
          </FormField>
          <FormField
            label="NAICS codes"
            name="naicsCodes"
            className="sm:col-span-2"
            hint={`The industries your experience supports — up to ${MAX_MEMBER_NAICS}, most relevant first.`}
            error={fieldError(state.issues, "naicsCodes")}
          >
            <div className="space-y-2">
              {draft.naicsCodes.map((code, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    options={NAICS_OPTIONS}
                    value={code}
                    aria-label={`NAICS code ${i + 1}`}
                    onChange={(e) =>
                      set(
                        "naicsCodes",
                        draft.naicsCodes.map((c, j) => (j === i ? e.target.value : c)),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      set("naicsCodes", draft.naicsCodes.filter((_, j) => j !== i))
                    }
                    aria-label={`Remove NAICS code ${i + 1}`}
                    className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {draft.naicsCodes.length < MAX_MEMBER_NAICS ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => set("naicsCodes", [...draft.naicsCodes, ""])}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add a NAICS code
                </Button>
              ) : null}
            </div>
          </FormField>
          <FormField
            label="Clearance level"
            name="clearanceLevel"
            error={fieldError(state.issues, "clearanceLevel")}
          >
            <Select
              options={CLEARANCE_LEVELS}
              id="clearanceLevel"
              value={draft.clearanceLevel}
              onChange={(e) =>
                set("clearanceLevel", e.target.value as ProfileEditorState["clearanceLevel"])
              }
            />
          </FormField>
        </CardBody>
      </Card>

      <RowSection
        title="Skills"
        rows={draft.skills}
        onAdd={() => addRow("skills", emptySkill())}
        onRemove={(i) => removeRow("skills", i)}
        addLabel="Add a skill"
        emptyText="No skills yet."
      >
        {(skill, i) => (
          <div className="grid grid-cols-1 gap-3 pr-6 sm:grid-cols-3">
            <FormField label="Skill" name={`skills.${i}.name`}>
              <div className="flex items-center gap-2">
                <TextInput
                  id={`skills.${i}.name`}
                  value={skill.name}
                  onChange={(e) => editRow("skills", i, { name: e.target.value })}
                  placeholder="e.g. RMF"
                />
                <SourceBadge source={skill.source} />
              </div>
            </FormField>
            <FormField label="Proficiency" name={`skills.${i}.proficiency`}>
              <Select
                options={PROFICIENCY_OPTIONS}
                id={`skills.${i}.proficiency`}
                value={skill.proficiency}
                onChange={(e) =>
                  editRow("skills", i, {
                    proficiency: e.target.value as EditableSkill["proficiency"],
                  })
                }
              />
            </FormField>
            <FormField label="Years" name={`skills.${i}.yearsExperience`}>
              <TextInput
                type="number"
                min={0}
                max={60}
                id={`skills.${i}.yearsExperience`}
                value={skill.yearsExperience}
                onChange={(e) => editRow("skills", i, { yearsExperience: e.target.value })}
              />
            </FormField>
          </div>
        )}
      </RowSection>

      <RowSection
        title="Certifications"
        rows={draft.certifications}
        onAdd={() => addRow("certifications", emptyCertification())}
        onRemove={(i) => removeRow("certifications", i)}
        addLabel="Add a certification"
        emptyText="No certifications yet."
      >
        {(cert, i) => (
          <div className="grid grid-cols-1 gap-3 pr-6 sm:grid-cols-2">
            <FormField label="Certification" name={`certifications.${i}.name`}>
              <div className="flex items-center gap-2">
                <TextInput
                  id={`certifications.${i}.name`}
                  value={cert.name}
                  onChange={(e) => editRow("certifications", i, { name: e.target.value })}
                  placeholder="e.g. CISSP"
                />
                <SourceBadge source={cert.source} />
              </div>
            </FormField>
            <FormField label="Issuer" name={`certifications.${i}.issuer`}>
              <TextInput
                id={`certifications.${i}.issuer`}
                value={cert.issuer}
                onChange={(e) => editRow("certifications", i, { issuer: e.target.value })}
                placeholder="e.g. ISC2"
              />
            </FormField>
            <FormField label="Issued" name={`certifications.${i}.issuedOn`}>
              <TextInput
                type="month"
                id={`certifications.${i}.issuedOn`}
                value={cert.issuedOn}
                onChange={(e) => editRow("certifications", i, { issuedOn: e.target.value })}
              />
            </FormField>
            <FormField label="Expires" name={`certifications.${i}.expiresOn`}>
              <TextInput
                type="month"
                id={`certifications.${i}.expiresOn`}
                value={cert.expiresOn}
                onChange={(e) => editRow("certifications", i, { expiresOn: e.target.value })}
              />
            </FormField>
          </div>
        )}
      </RowSection>

      <RowSection
        title="Experience"
        description="Federal engagements are what past-performance volumes are built from — mark those carefully."
        rows={draft.experience}
        onAdd={() => addRow("experience", emptyExperience())}
        onRemove={(i) => removeRow("experience", i)}
        addLabel="Add an engagement"
        emptyText="No experience yet."
      >
        {(exp, i) => (
          <div className="grid grid-cols-1 gap-3 pr-6 sm:grid-cols-2">
            <FormField label="Organization" name={`experience.${i}.organization`}>
              <div className="flex items-center gap-2">
                <TextInput
                  id={`experience.${i}.organization`}
                  value={exp.organization}
                  onChange={(e) => editRow("experience", i, { organization: e.target.value })}
                  placeholder="e.g. Northrop Grumman"
                />
                <SourceBadge source={exp.source} />
              </div>
            </FormField>
            <FormField label="Role" name={`experience.${i}.role`}>
              <TextInput
                id={`experience.${i}.role`}
                value={exp.role}
                onChange={(e) => editRow("experience", i, { role: e.target.value })}
                placeholder="e.g. Systems Engineering Manager"
              />
            </FormField>
            <FormField label="Started" name={`experience.${i}.startedOn`}>
              <TextInput
                type="month"
                id={`experience.${i}.startedOn`}
                value={exp.startedOn}
                onChange={(e) => editRow("experience", i, { startedOn: e.target.value })}
              />
            </FormField>
            <FormField
              label="Ended"
              name={`experience.${i}.endedOn`}
              hint="Leave blank if this is your current role."
            >
              <TextInput
                type="month"
                id={`experience.${i}.endedOn`}
                value={exp.endedOn}
                onChange={(e) => editRow("experience", i, { endedOn: e.target.value })}
              />
            </FormField>
            <FormField label="Summary" name={`experience.${i}.summary`} className="sm:col-span-2">
              <TextArea
                rows={2}
                id={`experience.${i}.summary`}
                value={exp.summary}
                onChange={(e) => editRow("experience", i, { summary: e.target.value })}
                placeholder="What you delivered on this engagement."
              />
            </FormField>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={exp.isFederal}
                  onChange={(e) => editRow("experience", i, { isFederal: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                This was a federal engagement
              </label>
            </div>
            {exp.isFederal ? (
              <>
                <FormField label="Agency" name={`experience.${i}.agency`}>
                  <TextInput
                    id={`experience.${i}.agency`}
                    value={exp.agency}
                    onChange={(e) => editRow("experience", i, { agency: e.target.value })}
                    placeholder="e.g. DISA"
                  />
                </FormField>
                <FormField label="Contract name" name={`experience.${i}.contractName`}>
                  <TextInput
                    id={`experience.${i}.contractName`}
                    value={exp.contractName}
                    onChange={(e) => editRow("experience", i, { contractName: e.target.value })}
                  />
                </FormField>
              </>
            ) : null}
          </div>
        )}
      </RowSection>

      <RowSection
        title="Education"
        rows={draft.education}
        onAdd={() => addRow("education", emptyEducation())}
        onRemove={(i) => removeRow("education", i)}
        addLabel="Add education"
        emptyText="No education yet."
      >
        {(edu, i) => (
          <div className="grid grid-cols-1 gap-3 pr-6 sm:grid-cols-2">
            <FormField label="Institution" name={`education.${i}.institution`}>
              <div className="flex items-center gap-2">
                <TextInput
                  id={`education.${i}.institution`}
                  value={edu.institution}
                  onChange={(e) => editRow("education", i, { institution: e.target.value })}
                  placeholder="e.g. Salve Regina University"
                />
                <SourceBadge source={edu.source} />
              </div>
            </FormField>
            <FormField label="Degree" name={`education.${i}.degree`}>
              <TextInput
                id={`education.${i}.degree`}
                value={edu.degree}
                onChange={(e) => editRow("education", i, { degree: e.target.value })}
                placeholder="e.g. Master of Arts"
              />
            </FormField>
            <FormField label="Field" name={`education.${i}.field`}>
              <TextInput
                id={`education.${i}.field`}
                value={edu.field}
                onChange={(e) => editRow("education", i, { field: e.target.value })}
                placeholder="e.g. Administration of Justice"
              />
            </FormField>
            <FormField label="Completed" name={`education.${i}.completedOn`}>
              <TextInput
                type="month"
                id={`education.${i}.completedOn`}
                value={edu.completedOn}
                onChange={(e) => editRow("education", i, { completedOn: e.target.value })}
              />
            </FormField>
          </div>
        )}
      </RowSection>

      <ErrorBanner state={state} />

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  );
}
