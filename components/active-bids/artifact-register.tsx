"use client";

import { useState } from "react";
import { Check, Copy, FileText, Lock } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { formatDate, humanizeEnum } from "@/lib/ui/format";
import { DOCUMENT_STATUS_STYLES, SENSITIVITY_STYLES } from "@/lib/ui/status";
import { StatusPill } from "@/components/ui/status-pill";

export interface ArtifactRow {
  id: string;
  name: string;
  category: string;
  status: string;
  version: string | null;
  storageProvider: string | null;
  storageReference: string | null;
  sensitivityMarking: string | null;
  effectiveDate: Date | null;
  notes: string | null;
}

/** Copy-to-clipboard for a reference path. Falls back silently if denied. */
function CopyPath({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(path);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* Clipboard blocked — the path is still visible and selectable. */
        }
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      aria-label={copied ? "Path copied" : `Copy path ${path}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-600" aria-hidden="true" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" aria-hidden="true" /> Copy path
        </>
      )}
    </button>
  );
}

/**
 * The artifact register.
 *
 * These rows are POINTERS, not payloads. `storageReference` is a path on the
 * operator's workstation; the pursuit folders carry CUI-marked material and
 * MacTech's posture keeps CUI off commercial services, so there is deliberately
 * no download affordance here — only a copyable path. Anything that adds one
 * later has to answer the accreditation question first.
 */
export function ArtifactRegister({ artifacts }: { artifacts: ArtifactRow[] }) {
  const grouped = artifacts.reduce<Record<string, ArtifactRow[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();

  return (
    <div className="divide-y divide-slate-100">
      {categories.map((category) => (
        <section key={category} className="px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {humanizeEnum(category)}
          </h4>
          <ul className="space-y-2.5">
            {grouped[category].map((a) => (
              <li key={a.id} className="flex items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-slate-800">{a.name}</span>
                    {a.version ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {a.version}
                      </span>
                    ) : null}
                    <StatusPill map={DOCUMENT_STATUS_STYLES} value={a.status} />
                    {a.sensitivityMarking ? (
                      <StatusPill map={SENSITIVITY_STYLES} value={a.sensitivityMarking} />
                    ) : null}
                    {a.effectiveDate ? (
                      <span className="text-xs text-slate-400">{formatDate(a.effectiveDate)}</span>
                    ) : null}
                  </div>
                  {a.notes ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.notes}</p> : null}
                  {a.storageReference ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <code
                        className={cn(
                          "min-w-0 flex-1 truncate rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[11px]",
                          a.sensitivityMarking === "CUI" ? "text-red-700" : "text-slate-500",
                        )}
                        title={a.storageReference}
                      >
                        {a.storageReference}
                      </code>
                      <CopyPath path={a.storageReference} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="flex items-start gap-2 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          Registered by reference. Paths resolve on the operator&apos;s workstation — no file content is
          stored in or served by this app, because these folders carry CUI and MacTech routes CUI through
          its secure portal rather than a commercial platform.
        </span>
      </p>
    </div>
  );
}
