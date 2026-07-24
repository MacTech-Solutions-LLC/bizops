import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Info, UserPlus } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { listTeamRoster } from "@/lib/services/team";
import { isAppError } from "@/lib/errors";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, PageHeader } from "@/components/ui/misc";
import { RosterTable } from "@/components/team/roster-table";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

/**
 * The Team section: every MacTech org member (identity live from the Hub),
 * their capability-profile state, and the alerts that show who is not yet
 * feeding the company-wide capability statement.
 */
export default async function TeamPage() {
  const ctx = await requireGovConContext();
  const isAdmin = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ADMIN);

  let body: React.ReactNode;
  try {
    const { entries, coverage, fromHub } = await listTeamRoster(ctx);

    body = (
      <div className="space-y-4">
        {!fromHub ? (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 ring-1 ring-blue-200">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              The Hub member roster isn&apos;t available right now, so this list shows only
              members with a BizOps profile. Teammates who have never signed in here may be
              missing.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardBody className="py-3">
              <p className="text-2xl font-semibold text-slate-900">{coverage.total}</p>
              <p className="text-xs text-slate-500">Team members</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p className="text-2xl font-semibold text-emerald-600">{coverage.contributing}</p>
              <p className="text-xs text-slate-500">Feeding the company statement</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p
                className={
                  coverage.missingResume.length > 0
                    ? "text-2xl font-semibold text-amber-600"
                    : "text-2xl font-semibold text-slate-900"
                }
              >
                {coverage.missingResume.length}
              </p>
              <p className="text-xs text-slate-500">Missing a resume</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p
                className={
                  coverage.missingStatement.length > 0
                    ? "text-2xl font-semibold text-amber-600"
                    : "text-2xl font-semibold text-slate-900"
                }
              >
                {coverage.missingStatement.length}
              </p>
              <p className="text-xs text-slate-500">Missing a capability statement</p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Members"
            description="Identity comes live from the Hub; capability data is what each member confirmed here."
          />
          <RosterTable entries={entries} />
        </Card>
      </div>
    );
  } catch (err) {
    if (isAppError(err)) {
      body = <ErrorState title="Couldn't load the team" description={err.userMessage} />;
    } else {
      throw err;
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Everyone in the MacTech org — their capability profiles, and what still needs doing before the company statement covers the whole team."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/team/company-statement">
                <FileText className="h-4 w-4" />
                Company statement
              </Link>
            </Button>
            {isAdmin ? (
              <Button asChild>
                <Link href="/team/onboard">
                  <UserPlus className="h-4 w-4" />
                  Add employee
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      {body}
    </>
  );
}
