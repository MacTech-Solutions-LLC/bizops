import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireAppAuthContext } from "@/lib/auth/context";
import { APP_NAME } from "@/lib/constants";

export default async function HomePage() {
  const ctx = await requireAppAuthContext();
  return (
    <main className="shell">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{APP_NAME}</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </header>
      <nav>
        <Link href="/company">Company</Link>
        <Link href="/team">Team</Link>
        <Link href="/campaigns">Campaigns</Link>
      </nav>
      <div className="card">
        <p>Hub-authorized workspace for org {ctx.hub.tenant.organizationId}</p>
        <p>Speed Mode v1 skeleton — mock Hub by default.</p>
      </div>
    </main>
  );
}
