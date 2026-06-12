/**
 * Dev smoke runner — HTTP probes against a running local instance (npm run dev).
 * Override base URL with SMOKE_BASE_URL or BASE_URL.
 */
const base = (
  process.env.SMOKE_BASE_URL ??
  process.env.BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const results = [];

function pass(label, detail) {
  results.push({ label, ok: true });
  console.log(`PASS  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, reason) {
  results.push({ label, ok: false, reason });
  console.error(`FAIL  ${label} — ${reason}`);
}

async function fetchJson(path) {
  const url = `${base}${path}`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  let body;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`non-JSON response (HTTP ${res.status})`);
  }
  return { res, body, url };
}

async function checkHealth() {
  const label = "GET /api/health";
  try {
    const { res, body } = await fetchJson("/api/health");
    if (res.status !== 200) {
      fail(label, `expected HTTP 200, got ${res.status}`);
      return;
    }
    if (body.status !== "ok" && body.ok !== true) {
      fail(label, `expected status ok, got ${JSON.stringify(body)}`);
      return;
    }
    pass(label, `status=${body.status ?? "ok"}`);
  } catch (err) {
    fail(label, err instanceof Error ? err.message : String(err));
  }
}

async function checkHubMock() {
  const label = "GET /api/smoke/hub-mock";
  try {
    const { res, body } = await fetchJson("/api/smoke/hub-mock");
    if (res.status !== 200) {
      fail(label, `expected HTTP 200, got ${res.status}`);
      return;
    }
    const hubOk = body.ok === true || body.allowed === true || body.status === "ok";
    if (!hubOk) {
      fail(label, `expected ok/allowed, got ${JSON.stringify(body)}`);
      return;
    }
    pass(label, body.allowed === true ? "allowed=true" : `status=${body.status ?? "ok"}`);
  } catch (err) {
    fail(label, err instanceof Error ? err.message : String(err));
  }
}

async function checkAuthGuard() {
  const label = "GET /api/summary (no auth → 403)";
  try {
    const { res, body } = await fetchJson("/api/summary");
    if (res.status !== 403) {
      fail(label, `expected HTTP 403, got ${res.status}`);
      return;
    }
    if (body.error !== "hub_auth_required") {
      fail(label, `expected error hub_auth_required, got ${JSON.stringify(body)}`);
      return;
    }
    pass(label, "hub_auth_required");
  } catch (err) {
    fail(label, err instanceof Error ? err.message : String(err));
  }
}

console.log(`smoke:dev — probing ${base}\n`);

await checkHealth();
await checkHubMock();
await checkAuthGuard();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
