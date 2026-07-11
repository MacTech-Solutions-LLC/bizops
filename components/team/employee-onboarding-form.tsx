"use client";

import { useFormState, useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Select, TextInput } from "@/components/ui/form";
import {
  createEmployeeOnboardingAction,
  type EmployeeOnboardingFormState,
} from "@/app/(app)/team/actions";

const APP_OPTIONS = [
  { value: "bizops", label: "BizOps" },
  { value: "client-portal", label: "Portal" },
  { value: "governance", label: "Governance" },
  { value: "qms", label: "QMS" },
  { value: "training", label: "Training" },
  { value: "proposal", label: "Proposal" },
  { value: "quality", label: "Quality" },
  { value: "codex", label: "Codex/Vault" },
];

const TRAINING_OPTIONS = [
  { value: "suite_orientation", label: "Suite orientation" },
  { value: "qms_document_control", label: "QMS document control" },
  { value: "cui_awareness", label: "CUI awareness" },
  { value: "security_impact_analysis", label: "Security impact analysis" },
];

const SIGNING_OPTIONS = [
  { value: "form_completion", label: "Form completion" },
  { value: "qms_record_approval", label: "QMS record approval" },
  { value: "contract_signature", label: "Contract signature" },
  { value: "bid_no_bid_approval", label: "Bid/no-bid approval" },
];

export function EmployeeOnboardingForm() {
  const [state, action] = useFormState<EmployeeOnboardingFormState, FormData>(
    createEmployeeOnboardingAction,
    { ok: false },
  );

  return (
    <form action={action} className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      {state.error ? (
        <p className="lg:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.packet ? (
        <div className="lg:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Created Hub profile {state.packet.hubUser.id}. Follow-up task is on the BizOps board.
        </div>
      ) : null}

      <FormField label="First name" name="firstName" error={state.issues?.firstName}>
        <TextInput name="firstName" autoComplete="given-name" />
      </FormField>
      <FormField label="Last name" name="lastName" error={state.issues?.lastName}>
        <TextInput name="lastName" autoComplete="family-name" />
      </FormField>
      <FormField label="Email" name="email" required error={state.issues?.email}>
        <TextInput name="email" type="email" required autoComplete="email" />
      </FormField>
      <FormField label="Hub role" name="role" error={state.issues?.role}>
        <Select
          name="role"
          defaultValue="customer_admin"
          options={[
            { value: "customer_admin", label: "Customer admin" },
            { value: "compliance_manager", label: "Compliance manager" },
            { value: "security_manager", label: "Security manager" },
            { value: "evidence_contributor", label: "Evidence contributor" },
          ]}
        />
      </FormField>
      <FormField label="Title" name="title">
        <TextInput name="title" />
      </FormField>
      <FormField label="Department" name="department">
        <TextInput name="department" />
      </FormField>
      <FormField label="Manager Hub user id" name="managerHubUserId">
        <TextInput name="managerHubUserId" />
      </FormField>
      <FormField label="Start date" name="startDate">
        <TextInput name="startDate" type="date" />
      </FormField>

      <CheckboxGroup title="App access" name="appEntitlements" options={APP_OPTIONS} />
      <CheckboxGroup title="Training" name="trainingRequirementKeys" options={TRAINING_OPTIONS} />
      <CheckboxGroup title="Forms and signing" name="signingAuthorityKinds" options={SIGNING_OPTIONS} />

      <label className="lg:col-span-2 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="sendInvite" value="true" className="h-4 w-4 rounded border-slate-300" />
        Queue Hub invitation follow-up
      </label>

      <div className="lg:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function CheckboxGroup({
  title,
  name,
  options,
}: {
  title: string;
  name: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-medium text-slate-600">{title}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              className="h-4 w-4 rounded border-slate-300"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <UserPlus className="h-4 w-4" />
      {pending ? "Creating..." : "Create Hub profile"}
    </Button>
  );
}
