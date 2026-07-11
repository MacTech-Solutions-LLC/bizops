"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FormField, Select, TextInput } from "@/components/ui/form";
import { createDocumentAction, type DocFormState } from "@/app/(app)/documents/actions";

const CATEGORIES = [
  "SOLICITATION", "AMENDMENT", "QA", "CAPTURE", "PROPOSAL_DRAFT", "FINAL_PROPOSAL",
  "PRICING", "NDA", "TEAMING_AGREEMENT", "SUBCONTRACT", "CAPABILITY_STATEMENT",
  "PAST_PERFORMANCE", "RESUME", "CERTIFICATION", "COMPLIANCE_EVIDENCE", "AWARD",
  "DEBRIEF", "CORRESPONDENCE", "OTHER",
].map((v) => ({ value: v, label: v.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) }));

const PROVIDERS = [
  { value: "railway_volume", label: "Railway Volume" },
  { value: "s3", label: "S3-compatible" },
  { value: "azure_blob", label: "Azure Blob" },
  { value: "google_drive", label: "Google Drive" },
  { value: "sharepoint", label: "SharePoint" },
  { value: "github", label: "GitHub" },
];

export function DocumentForm({ opportunities }: { opportunities: Array<{ id: string; name: string }> }) {
  const [state, action] = useFormState<DocFormState, FormData>(createDocumentAction, { ok: false });
  return (
    <form action={action} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {state.error ? (
        <p className="sm:col-span-2 lg:col-span-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="sm:col-span-2 lg:col-span-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Document registered.</p>
      ) : null}
      <FormField label="Name" name="name" required error={state.issues?.name}>
        <TextInput name="name" required maxLength={300} />
      </FormField>
      <FormField label="Category" name="category">
        <Select name="category" options={CATEGORIES} defaultValue="OTHER" />
      </FormField>
      <FormField label="Related opportunity" name="opportunityId">
        <Select
          name="opportunityId"
          placeholder="— none —"
          options={opportunities.map((o) => ({ value: o.id, label: o.name.replace("[DEMO] ", "") }))}
        />
      </FormField>
      <FormField label="Storage provider" name="storageProvider">
        <Select name="storageProvider" options={PROVIDERS} defaultValue="railway_volume" />
      </FormField>
      <FormField label="Storage reference (key/path/URL)" name="storageReference" hint="Metadata only — no binaries stored">
        <TextInput name="storageReference" />
      </FormField>
      <FormField label="Sensitivity marking" name="sensitivityMarking">
        <TextInput name="sensitivityMarking" placeholder="CUI, PROPRIETARY, PUBLIC" />
      </FormField>
      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <Submit />
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registering…" : "Register document"}
    </Button>
  );
}
