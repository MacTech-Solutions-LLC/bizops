"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import type { Option } from "@/lib/ui/enums";

export function FormField({
  label,
  name,
  error,
  hint,
  children,
  className,
  required,
}: {
  label: string;
  name?: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {error?.length ? (
        <p className="mt-1 text-xs text-red-600">{error.join(", ")}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} id={props.id ?? props.name} className={cn(inputCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      id={props.id ?? props.name}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
        props.className,
      )}
    />
  );
}

export function Select({
  options,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <select {...props} id={props.id ?? props.name} className={cn(inputCls, props.className)}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="gc-card p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">{title}</legend>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}
