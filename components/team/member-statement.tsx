import { FileText } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import type { StatementFacts } from "@/lib/capability-statement/assemble";
import type { StoredStatementView } from "@/lib/services/capability-statement";

/**
 * Read-only rendering of a member's confirmed capability statement for their
 * Team page. No edit or regenerate controls — those live on the member's own
 * My Profile screen; colleagues only read.
 */

function Bullets({ title, rows }: { title: string; rows: string[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{title}</h4>
      <ul className="space-y-1">
        {rows.map((row, i) => (
          <li key={i} className="flex items-baseline gap-1.5 text-sm text-slate-700">
            <span className="text-blue-400">•</span>
            {row}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MemberStatementCard({
  statement,
  facts,
}: {
  statement: StoredStatementView | null;
  facts: StatementFacts | null;
}) {
  if (!statement) {
    return (
      <Card>
        <CardHeader title="Capability statement" />
        <CardBody>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No capability statement yet"
            description="This member hasn't generated and confirmed their capability statement."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Capability statement"
        description={
          statement.confirmedAt
            ? `Confirmed ${new Date(statement.confirmedAt).toLocaleDateString()}`
            : undefined
        }
      />
      <CardBody className="space-y-5">
        {statement.professionalSummary ? (
          <p className="whitespace-pre-line text-sm text-slate-700">
            {statement.professionalSummary}
          </p>
        ) : null}
        <Bullets title="Core competencies" rows={statement.coreCompetencies} />
        <Bullets title="Differentiators" rows={statement.differentiators} />
        <Bullets title="Past-performance highlights" rows={statement.pastPerformanceHighlights} />

        {facts && facts.certifications.length > 0 ? (
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Certifications
            </h4>
            <ul className="flex flex-wrap gap-2">
              {facts.certifications.map((c, i) => (
                <li
                  key={i}
                  className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                >
                  {c.name}
                  {c.issuer ? <span className="text-slate-400"> · {c.issuer}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
