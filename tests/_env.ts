/**
 * Test env loader — reads .env into process.env if present, so DB-backed tests
 * pick up DATABASE_URL without depending on the shell. No-op when .env is absent
 * (CI passes DATABASE_URL directly). Import this first in DB test files.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue; // don't override real env
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
} catch {
  // .env not present — rely on the ambient environment.
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);
