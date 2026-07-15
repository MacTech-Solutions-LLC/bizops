"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { CheckCircle2, FileText, Pencil, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { publishProfileAction, type FormState } from "@/app/(app)/onboarding/actions";
import type { StoredProfile } from "@/lib/profile/edit-payload";
import { ProfileEditor } from "./profile-editor";
import { ProfileSummary } from "./profile-summary";
import { ResumeReview } from "./resume-review";
import { ErrorBanner, SubmitButton } from "./form-bits";

/**
 * The "My Profile" screen once a profile has content.
 *
 * Three modes over the same record: read it, hand-edit it, or refill it from a
 * resume. Saving in any mode revalidates `/onboarding`, so the server component
 * re-renders and hands this component fresh props — which is why nothing here
 * caches the profile in state beyond the editor's own draft.
 */
type Mode = "view" | "edit" | "resume";

function PublishCard({ status }: { status: string }) {
  const [state, formAction] = useFormState<FormState, FormData>(publishProfileAction, {
    ok: false,
  });

  if (status === "published") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <p>
          <strong>Published.</strong> This profile is eligible for capability statements.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Publish your profile"
        description="A draft profile is never used in a capability statement or an org-wide rollup. Publishing is what makes it count — you can keep editing afterwards."
      />
      <CardBody className="space-y-3">
        <ErrorBanner state={state} />
        <form action={formAction}>
          <SubmitButton>Publish profile</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}

export function ProfilePanel({
  profile,
  status,
}: {
  profile: StoredProfile;
  status: string;
}) {
  const [mode, setMode] = useState<Mode>("view");

  if (mode === "edit") {
    return <ProfileEditor profile={profile} onCancel={() => setMode("view")} />;
  }

  if (mode === "resume") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Saving a resume <strong>replaces</strong> your skills, certifications, experience, and
            education with what you confirm on the review screen. Anything you added by hand and
            don&apos;t re-confirm will be removed.
          </p>
        </div>
        <ResumeReview />
        <Button type="button" variant="ghost" onClick={() => setMode("view")}>
          Back to my profile
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => setMode("edit")}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit profile
        </Button>
        <Button type="button" variant="ghost" onClick={() => setMode("resume")}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Update from a resume
        </Button>
      </div>

      <ProfileSummary profile={profile} />
      <PublishCard status={status} />
    </div>
  );
}
