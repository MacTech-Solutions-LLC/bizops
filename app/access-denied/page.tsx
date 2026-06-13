import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="shell">
      <h1>Access denied</h1>
      <p>Hub did not authorize BizOps access for this account or organization.</p>
      <p>
        Try selecting a different organization, or ask an admin to enable BizOps in Product
        Access.
      </p>
      <p>
        <Link href="/choose-organization">Choose organization</Link>
      </p>
    </main>
  );
}
