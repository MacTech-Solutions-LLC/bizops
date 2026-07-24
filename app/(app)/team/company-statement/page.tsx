import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileWarning, Info } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { getCompanyStatement } from "@/lib/services/company-statement";
import { listTeamRoster } from "@/lib/services/team";
import { isAppError } from "@/lib/errors";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState, PageHeader } from "@/components/ui/misc";
import { CompanyStatementSection } from "@/components/team/company-statement";
import type { TeamRosterEntry } from "@/lib/domain/team";

export const metadata: Metadata = { title: "Company Capability Statement" };
export const dynamic = "force-dynamic";

function shortId(hubUserId: string): string {
  return hubUserId.length > 12 ? `${hubUserId.slice(0, 12)}…` : hubUserId;
}

/** One member row in the coverage panel, with what they're missing. */
function CoverageRow({ entry }: { entry: TeamRosterEntry }) {
  const missing: string[] = [];
  if (!entry.hasResume) missing.push("resume");
  if (!entry.hasStatement) missing.push("capability statement");
  if (entry.hasResume && entry.hasStatement && !entry.isPublished) missing.push("publish");

  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <Link
        href={`/team/${encodeURIComponent(entry.hubUserId)}`}
        title={entry.displayName ?? entry.hubUserId}
        className="min-w-0 truncate text-sm text-slate-700 hover:text-blue-600"
      >
        {entry.displayName ?? shortId(entry.hubUserId)}
      </Link>
      {entry.isContributing ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Contributing
        </span>
      ) : (
        <span className="shrink-0 text-xs text-amber-700">Missing: {missing.join(", ")}</span>
      )}
    </li>
  );
}

/**
 * The unified company-wide capability statement: everyone can read it; a
 * manager generates, edits, and confirms it. The coverage panel is the alert
 * surface — who is feeding the statement and who still owes inputs.
 */
export default async function CompanyStatementPage() {
  const ctx = await requireGovConContext();
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_PROFILE_MANAGE);

  let body: React.ReactNode;
  try {
    const [{ statement, facts }, roster] = await Promise.all([
      getCompanyStatement(ctx),
      listTeamRoster(ctx),
    ]);

    const notContributing = roster.entries.filter((e) => !e.isContributing);

    body = (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <CompanyStatementSection statement={statement} facts={facts} canManage={canManage} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Ingestion coverage"
              description={`${roster.coverage.contributing} of ${roster.coverage.total} members are feeding the company statement.`}
            />
            <CardBody>
              {!roster.fromHub ? (
                <div className="mb-2 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 ring-1 ring-blue-200">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    The Hub member roster isn&apos;t available (is{" "}
                    <code className="font-mono">MACTECH_HUB_ROSTER_TOKEN</code> configured?), so
                    names can&apos;t be shown and teammates who have never signed in here may be
                    missing from this list.
                  </p>
                </div>
              ) : null}
              {notContributing.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Every member is contributing.
                </p>
              ) : (
                <>
                  <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                    <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>
                      These members&apos; details are <strong>not</strong> in the statement yet.
                      They need to upload a resume, confirm their capability statement, and
                      publish their profile on My Profile.
                    </p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {notContributing.map((e) => (
                      <CoverageRow key={e.hubUserId} entry={e} />
                    ))}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How this works" />
            <CardBody>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li>
                  <strong className="text-slate-800">Best of the best.</strong> The draft pulls
                  from every published profile and every member-confirmed capability statement —
                  nothing a member hasn&apos;t confirmed can reach it.
                </li>
                <li>
                  <strong className="text-slate-800">Nothing saves without review.</strong> AI
                  drafts, a manager edits and confirms every line before it&apos;s stored.
                </li>
                <li>
                  <strong className="text-slate-800">Facts stay live.</strong> NAICS coverage,
                  certifications, clearance mix, and past performance render fresh from published
                  profiles — they update as the team does.
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  } catch (err) {
    if (isAppError(err)) {
      body = (
        <ErrorState title="Couldn't load the company statement" description={err.userMessage} />
      );
    } else {
      throw err;
    }
  }

  return (
    <>
      <PageHeader
        title="Company capability statement"
        subtitle="One statement for all of MacTech, built from what every member has confirmed."
        actions={
          <Link
            href="/team"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to team
          </Link>
        }
      />
      {body}
    </>
  );
}
