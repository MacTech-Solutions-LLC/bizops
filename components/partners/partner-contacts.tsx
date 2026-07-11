"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/ui/form";
import {
  addPartnerContactAction,
  deletePartnerContactAction,
} from "@/app/(app)/partners/actions";

export interface PartnerContactRow {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export function PartnerContacts({
  partnerId,
  contacts,
  canManage,
}: {
  partnerId: string;
  contacts: PartnerContactRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(formData: FormData) {
    const input = {
      name: formData.get("name"),
      title: formData.get("title"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      isPrimary: formData.get("isPrimary") === "on",
    };
    startTransition(async () => {
      const res = await addPartnerContactAction(partnerId, input);
      if (res.ok) {
        setAdding(false);
        setError(null);
        router.refresh();
      } else {
        setError(res.error ?? "Could not add contact");
      }
    });
  }

  function remove(contactId: string) {
    startTransition(async () => {
      const res = await deletePartnerContactAction(partnerId, contactId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not remove contact");
    });
  }

  return (
    <div>
      {contacts.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">No contacts yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  {c.name}
                  {c.isPrimary ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Primary" /> : null}
                </p>
                <p className="text-xs text-slate-500">{c.title ?? "—"}</p>
                <p className="text-xs text-slate-400">
                  {c.email ?? "—"}{c.phone ? ` · ${c.phone}` : ""}
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => remove(c.id)}
                  disabled={pending}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="border-t border-slate-100 p-4">
          {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
          {adding ? (
            <form action={add} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Name" name="name" required>
                  <TextInput name="name" required />
                </FormField>
                <FormField label="Title" name="title">
                  <TextInput name="title" />
                </FormField>
                <FormField label="Email" name="email">
                  <TextInput name="email" type="email" />
                </FormField>
                <FormField label="Phone" name="phone">
                  <TextInput name="phone" />
                </FormField>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="isPrimary" /> Primary contact
              </label>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Add contact"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add contact
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
