"use client";

import { Plus, X } from "lucide-react";
import { TextInput } from "@/components/ui/form";

/**
 * An editable bullet list — add, edit, remove. Blank rows are allowed while
 * editing; the save schemas drop them. Shared by the member and company
 * capability-statement review screens.
 */
export function BulletEditor({
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
