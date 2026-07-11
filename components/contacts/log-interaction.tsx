"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField, Select, TextArea, TextInput } from "@/components/ui/form";
import { logInteractionAction, type FormState } from "@/app/(app)/contacts/actions";

const CHANNELS = [
  { value: "", label: "— channel —" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "event", label: "Event" },
];

export function LogInteraction({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState<FormState, FormData>(logInteractionAction, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 p-4">
      <input type="hidden" name="contactId" value={contactId} />
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Date" name="occurredAt">
          <TextInput name="occurredAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Channel" name="channel">
          <Select name="channel" options={CHANNELS} defaultValue="" />
        </FormField>
      </div>
      <FormField label="Summary" name="summary" required error={state.issues?.summary}>
        <TextArea name="summary" rows={2} required placeholder="What was discussed?" />
      </FormField>
      <FormField label="Follow-up" name="followUp">
        <TextInput name="followUp" placeholder="Next step or owner" />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Logging…" : "Log interaction"}
    </Button>
  );
}
