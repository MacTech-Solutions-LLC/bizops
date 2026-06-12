/**
 * Clerk middleware monitor — zero-dependency, unauthenticated probes.
 *
 * Detects Clerk middleware regressions on a deployed (or local) instance
 * without credentials. Usage:
 *   node scripts/monitor-clerk.mjs [baseUrl]
 *   MONITOR_BASE_URL=https://... node scripts/monitor-clerk.mjs
 */
const base = (
  process.argv[2] ??
  process.env.MONITOR_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const PROTECTED_API = "/api/summary";
const PROTECTED_PAGE = "/company";

let failed = false;

function report(ok, label, url, status, extra = "") {
  const tag = ok ? "PASS" : "FAIL";
  if (!ok) failed = true;
  console.log(`${tag}  ${label} — ${url} [${status}]${extra ? ` ${extra}` : ""}`);
}

function clerkHeaders(res) {
  const status = res.headers.get("x-clerk-auth-status");
  const reason = res.headers.get("x-clerk-auth-reason");
  const parts = [];
  if (status) parts.push(`x-clerk-auth-status=${status}`);
  if (reason) parts.push(`x-clerk-auth-reason=${reason}`);
  return parts.join(" ");
}

async function probe(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "manual" });
  return { url, res };
}

// a. Public health route must stay allowlisted
async function checkHealth() {
  const { url, res } = await probe("/api/health");
  report(res.status === 200, "public /api/health returns 200", url, res.status);
}

// b. Root unauthenticated: middleware must run (redirect to sign-in OR Clerk headers present)
async function checkRootMiddleware() {
  const { url, res } = await probe("/");
  const headers = clerkHeaders(res);
  const isRedirect = res.status >= 300 && res.status < 400;
  const ok = isRedirect || headers.length > 0;
  report(
    ok,
    "GET / unauthenticated shows middleware ran (3xx or Clerk headers)",
    url,
    res.status,
    headers || (isRedirect ? `location=${res.headers.get("location") ?? ""}` : "(no Clerk headers)"),
  );
}

// c. Protected API must NOT be 200 and NOT 500 when unauthenticated
async function checkProtectedApi() {
  const { url, res } = await probe(PROTECTED_API);
  const ok = res.status !== 200 && res.status !== 500;
  report(
    ok,
    `protected API ${PROTECTED_API} rejects unauthenticated (401/403/3xx, not 200/500)`,
    url,
    res.status,
    clerkHeaders(res),
  );
}

// d. Protected page must not serve content to unauthenticated requests
async function checkProtectedPage() {
  const { url, res } = await probe(PROTECTED_PAGE);
  const ok = res.status !== 200;
  report(
    ok,
    `protected page ${PROTECTED_PAGE} not served unauthenticated`,
    url,
    res.status,
    clerkHeaders(res),
  );
}

console.log(`monitor-clerk base: ${base}`);
try {
  await checkHealth();
  await checkRootMiddleware();
  await checkProtectedApi();
  await checkProtectedPage();
} catch (err) {
  console.error(`FAIL  probe error — ${err instanceof Error ? err.message : String(err)}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
