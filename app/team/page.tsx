import { requireAppAuthContext } from "@/lib/auth/context";
import { listTeam } from "@/lib/domain/store";

export default async function TeamPage() {
  const ctx = await requireAppAuthContext();
  const members = listTeam(ctx.hub.tenant.organizationId);
  return (
    <main className="shell">
      <h1>Team roster</h1>
      <ul>
        {members.map((m) => (
          <li key={m.id} className="card">
            {m.displayName} — {m.role} (hubUserId: {m.hubUserId})
          </li>
        ))}
      </ul>
    </main>
  );
}
