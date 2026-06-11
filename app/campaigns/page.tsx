import { requireAppAuthContext } from "@/lib/auth/context";
import { listCampaigns } from "@/lib/domain/store";

export default async function CampaignsPage() {
  const ctx = await requireAppAuthContext();
  const items = listCampaigns(ctx.hub.tenant.organizationId);
  return (
    <main className="shell">
      <h1>Campaigns</h1>
      <ul>
        {items.map((c) => (
          <li key={c.id} className="card">
            {c.name} — {c.status} — {c.leadCount} leads
          </li>
        ))}
      </ul>
    </main>
  );
}
