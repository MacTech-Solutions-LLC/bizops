import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getOrCreateProfile } from "@/lib/services/member-profile";
import { isAppError } from "@/lib/errors";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState, PageHeader, ProgressBar } from "@/components/ui/misc";
import { cn } from "@/lib/ui/cn";
import { ResumeReview } from "@/components/onboarding/resume-review";
import { ProfilePanel } from "@/components/onboarding/profile-panel";
import { isProfileStarted } from "@/lib/domain/member-profile";

export const metadata: Metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await requireGovConContext();

  let body: React.ReactNode;
  let heading = {
    title: "Complete your profile",
    subtitle:
      "Upload your resume to fill in most of it, or type it in yourself. This is what your MacTech capability statement is built from.",
  };
  try {
    const { profile, completeness } = await getOrCreateProfile(ctx);

    // A profile with nothing in it opens on the upload wizard; once it has
    // content, the page is the profile — showing a member an upload box on top
    // of details they already saved reads as though the save didn't take.
    const started = isProfileStarted(profile);
    if (started) {
      heading = {
        title: "My profile",
        subtitle: "This is what your MacTech capability statement is built from.",
      };
    }

    body = (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {started ? (
            <ProfilePanel profile={profile} status={profile.status} />
          ) : (
            <ResumeReview />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Profile completeness"
              description={
                profile.status === "published"
                  ? "Published — eligible for capability statements."
                  : "Draft — not yet used in capability statements."
              }
            />
            <CardBody className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold text-slate-900">
                    {completeness.score}%
                  </span>
                  <span className="text-xs text-slate-500">complete</span>
                </div>
                <ProgressBar
                  value={completeness.score}
                  label="Profile completeness"
                  barClassName={cn(
                    completeness.score >= 80
                      ? "bg-emerald-500"
                      : completeness.score >= 40
                        ? "bg-blue-500"
                        : "bg-amber-500",
                  )}
                />
              </div>

              {completeness.nextSteps.length > 0 ? (
                <div>
                  <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    What&apos;s next
                  </h4>
                  <ul className="space-y-2">
                    {completeness.nextSteps.map((step) => (
                      <li key={step.key} className="text-xs">
                        <span className="font-medium text-slate-700">{step.label}</span>
                        <p className="text-slate-500">{step.hint}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-emerald-700">
                  Your profile has everything a capability statement needs.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How your resume is handled" />
            <CardBody>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-slate-800">The file is never stored.</strong> It&apos;s read
                    once in memory to pull out your details, then discarded. There&apos;s no copy on our
                    servers to delete later.
                  </span>
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-slate-800">Nothing saves without you.</strong> Every
                    extracted field is shown for review first. Uncheck anything wrong.
                  </span>
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-slate-800">Clearance is never guessed.</strong> It&apos;s
                    read from your resume&apos;s exact wording, or left blank for you to set.
                  </span>
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>
                    Resume <em>text</em> is sent to Anthropic&apos;s API to be parsed. Your name and
                    contact details are not extracted.
                  </span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  } catch (err) {
    if (isAppError(err)) {
      body = <ErrorState title="Couldn't load your profile" description={err.userMessage} />;
    } else {
      throw err;
    }
  }

  return (
    <>
      <PageHeader title={heading.title} subtitle={heading.subtitle} />
      {body}
    </>
  );
}
