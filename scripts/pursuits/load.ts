/**
 * Loads pursuit records from outside the repository.
 *
 * Bid data never lives in git. `PURSUIT_DATA_DIR` (default
 * `~/Contracting/.bizops-pursuits/`) holds one JSON file per pursuit; each is
 * validated against `pursuitSchema` before it can reach the database, so a
 * malformed or hand-edited record fails loudly at load rather than landing
 * half-ingested.
 */

import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { pursuitSchema, type PursuitData } from "./schema";

/** Expand a leading `~` so PURSUIT_DATA_DIR can be written the way humans write it. */
function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

export function pursuitDataDir(): string {
  const raw = process.env.PURSUIT_DATA_DIR ?? "~/Contracting/.bizops-pursuits";
  const expanded = expandHome(raw);
  return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
}

/**
 * Read and validate every pursuit record in the data directory, sorted by key so
 * ingest order is stable across runs and machines.
 */
export function loadPursuits(): PursuitData[] {
  const dir = pursuitDataDir();

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch (err) {
    throw new Error(
      `Cannot read pursuit data directory: ${dir}\n` +
        `Bid data lives outside this repository — point PURSUIT_DATA_DIR at the folder holding\n` +
        `the pursuit JSON records (see docs/PURSUIT_INGEST.md).\n` +
        `  ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (files.length === 0) {
    throw new Error(`No pursuit records (*.json) found in ${dir}`);
  }

  return files.map((file) => {
    const full = join(dir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(full, "utf8"));
    } catch (err) {
      throw new Error(`${file}: not valid JSON — ${err instanceof Error ? err.message : String(err)}`);
    }

    const parsed = pursuitSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `    ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      throw new Error(`${file}: does not match the pursuit schema\n${issues}`);
    }
    return parsed.data;
  });
}
