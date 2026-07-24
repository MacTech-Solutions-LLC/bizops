import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileWarning, Lock } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getTeamMemberView } from "@/lib/services/team";
import { isAppError, NotFoundError } from "@/lib/errors";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui/misc";
import { PROFILE_STATUS_STYLES } from "@/lib/ui/status";
import { ProfileSummary } from "@/components/onboarding/profile-summary";
import { MemberStatementCard } from "@/components/team/member-statement";

export const metadata: Metadata = { title: "Team Member" };
export const dynamic = "force-dynamic";

/**
 * One member's Team page: their published capability profile and confirmed
 * capability statement, read-only. Unpublished content stays private to the
 * member and profile managers — everyone else sees the status and what's
 * still missing.
 */
export default async function TeamMemberPage({
  params,
}: {
  params: { hubUserId: string };
}) {
  const ctx = await requireGovConContext();
  const hubUserId = decodeURIComponent(params.hubUserId);

  let body: React.ReactNode;
  let heading: { title: string; subtitle?: string } = { title: "Team member" };

  try {
    const view = await getTeamMemberView(ctx, hubUserId);
    const name = view.displayName ?? view.hubUserId;
    heading = { title: name, subtitle: view.email ?? undefined };

    const isSelf = hubUserId === ctx.actorHubUserId;

    body = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={view.displayName} id={view.hubUserId} />
          <StatusPill
            map={PROFILE_STATUS_STYLES}
            value={view.profileStatus ?? "not_started"}
          />
          {!view.hasResume ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              <FileWarning className="h-3.5 w-3.5" />
              No resume uploaded
            </span>
          ) : null}
          {!view.hasStatement ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              <FileWarning className="h-3.5 w-3.5" />
              No capability statement
            </span>
          ) : null}
          {isSelf ? (
            <Link
              href="/onboarding"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Edit on My Profile →
            </Link>
          ) : null}
        </div>

        {view.profile ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <ProfileSummary profile={view.profile} />
            </div>
            <div className="space-y-4">
              <MemberStatementCard statement={view.statement} facts={view.facts} />
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader title="Profile" />
            <CardBody>
              <EmptyState
                icon={<Lock className="h-8 w-8" />}
                title={
                  view.profileStatus === null
                    ? "No profile yet"
                    : "Profile not published yet"
                }
                description={
                  view.profileStatus === null
                    ? "This member hasn't started their capability profile in BizOps."
                    : "Their profile stays private until they publish it from My Profile."
                }
              />
            </CardBody>
          </Card>
        )}
      </div>
    );
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    if (isAppError(err)) {
      body = <ErrorState title="Couldn't load this member" description={err.userMessage} />;
    } else {
      throw err;
    }
  }

  return (
    <>
      <PageHeader
        title={heading.title}
        subtitle={heading.subtitle}
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
