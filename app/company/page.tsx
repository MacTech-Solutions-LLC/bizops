import { requireAppAuthContext } from "@/lib/auth/context";
import { getCompanyProfile } from "@/lib/domain/store";

export default async function CompanyPage() {
  const ctx = await requireAppAuthContext();
  const profile = getCompanyProfile(ctx.hub.tenant.organizationId);
  return (
    <main className="shell">
      <h1>Company profile</h1>
      <div className="card">
        <p>Legal name: {profile.legalName}</p>
        <p>DBA: {profile.dba}</p>
        <p>CAGE: {profile.cageCode}</p>
      </div>
    </main>
  );
}
