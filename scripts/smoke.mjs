#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function check(path, label) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url);
  const body = await res.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`${label}: non-JSON response from ${url} (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`${label}: ${url} returned ${res.status}: ${body}`);
  }
  console.log(`${label}: ok`, json);
  return json;
}

async function main() {
  await check("/api/health", "health");
  await check("/api/smoke/hub-mock", "hub-mock");
  console.log("smoke: all checks passed");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
