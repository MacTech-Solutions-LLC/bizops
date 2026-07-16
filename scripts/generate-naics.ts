/**
 * Regenerate `lib/naics/naics-2022.json` from the Census Bureau's published
 * NAICS structure.
 *
 * The table is checked in rather than fetched at runtime: a capability
 * statement's NAICS codes must not change because a government website was
 * down or quietly republished, and the file is small. Re-run this when NAICS
 * revises (every 5 years — 2022, then 2027) and review the diff.
 *
 * Usage: npx tsx scripts/generate-naics.ts
 *
 * Requires python3 with openpyxl to read the workbook (Census publishes .xlsx
 * only). The parse asserts the expected code count, so a changed sheet layout
 * fails loudly rather than writing a truncated table.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCE_URL = "https://www.census.gov/naics/2022NAICS/2-6%20digit_2022_Codes.xlsx";
const REVISION = "2022";
/** Official count of 6-digit US industries in NAICS 2022. */
const EXPECTED_CODES = 1012;
const OUT = join(process.cwd(), "lib/naics/naics-2022.json");

const PARSE = `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1])
ws = wb.active
out = {}
for row in ws.iter_rows(min_row=2, values_only=True):
    code, title = row[1], row[2]
    if code is None or title is None:
        continue
    s = str(code).strip()
    if len(s) == 6 and s.isdigit():
        out[s] = str(title).strip()
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False)
`;

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "naics-"));
  const xlsx = join(dir, "naics.xlsx");
  const parsed = join(dir, "naics.json");

  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Census fetch failed: ${res.status}`);
  writeFileSync(xlsx, Buffer.from(await res.arrayBuffer()));

  const script = join(dir, "parse.py");
  writeFileSync(script, PARSE);
  execFileSync("python3", [script, xlsx, parsed], { stdio: "inherit" });

  const codes = JSON.parse(
    execFileSync("cat", [parsed], { encoding: "utf8" }),
  ) as Record<string, string>;

  const count = Object.keys(codes).length;
  if (count !== EXPECTED_CODES) {
    throw new Error(
      `Expected ${EXPECTED_CODES} six-digit codes, parsed ${count}. ` +
        `The sheet layout or the NAICS revision changed — check before writing.`,
    );
  }

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        $comment: "GENERATED — do not edit by hand. Regenerate with: npx tsx scripts/generate-naics.ts",
        source:
          "U.S. Census Bureau, 2022 NAICS United States Structure (2-6 digit_2022_Codes.xlsx)",
        sourceUrl: SOURCE_URL,
        revision: REVISION,
        codes,
      },
      null,
      0,
    ),
  );
  console.log(`wrote ${count} codes to ${OUT}`);
}

main();
