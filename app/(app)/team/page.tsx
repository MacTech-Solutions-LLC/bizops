import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { PageHeader, PermissionState } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmployeeOnboardingForm } from "@/components/team/employee-onboarding-form";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await requireGovConContext();
  const canManage = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ADMIN);

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Create Hub profiles and route onboarding work across the suite."
      />
      {!canManage ? (
        <PermissionState description="Team onboarding requires GovCon admin permission." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card>
            <CardHeader
              title="Add employee"
              description="BizOps starts the request; Hub remains the user and access authority."
            />
            <EmployeeOnboardingForm />
          </Card>
          <Card>
            <CardHeader title="Onboarding routing" />
            <CardBody className="space-y-3 text-sm text-slate-600">
              <div className="flex gap-2">
                <Users className="mt-0.5 h-4 w-4 text-blue-600" />
                <p>
                  The submitted profile becomes discoverable by Hub user id across
                  Training, QMS, Governance, Portal, and workflow tasks.
                </p>
              </div>
              <p>
                Training owns assignments and completion evidence. QMS owns forms,
                document tasks, and quality records. Governance owns signing and
                delegation authority. Portal displays the employee profile and
                notifications from the suite graph.
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
