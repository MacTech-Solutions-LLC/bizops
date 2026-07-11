import type { Metadata } from "next";
import { requireGovConContext } from "@/lib/auth/govcon-context";
import { getCompanyProfile } from "@/lib/services/settings";
import { hasGovConPermission } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { getHubAuthorityMode } from "@/lib/hub/client";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/misc";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireGovConContext();
  const canEdit = hasGovConPermission(ctx, GOVCON_PERMISSIONS.GOVCON_ADMIN);
  const profile = await getCompanyProfile(ctx);

  return (
    <>
      <PageHeader title="Settings" subtitle="Organization identity, access, and integration status." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Company profile"
              description="Business identity used across pursuits and readiness. Editable by GovCon admins."
            />
            <CompanyProfileForm
              canEdit={canEdit}
              values={{
                legalName: profile?.legalName,
                dba: profile?.dba,
                cageCode: profile?.cageCode,
                uei: profile?.uei,
                naicsPrimary: profile?.naicsPrimary,
              }}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your access" />
            <div className="space-y-3 p-4">
              <Field label="Organization (tenant)">{ctx.tenantOrgId}</Field>
              <Field label="Roles">{ctx.roles.length ? ctx.roles.join(", ") : "—"}</Field>
              <Field label="Granted permissions">
                <div className="mt-1 flex flex-wrap gap-1">
                  {[...ctx.permissions].map((p) => (
                    <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                      {p.replace("org:govcon:", "")}
                    </span>
                  ))}
                </div>
              </Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Integration" />
            <div className="space-y-3 p-4">
              <Field label="App key">bizops</Field>
              <Field label="Hub authority mode">{getHubAuthorityMode()}</Field>
              <Field label="Identity">Clerk (via MacTech Suite)</Field>
              <Field label="Audit">MacTech Hub central audit</Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
