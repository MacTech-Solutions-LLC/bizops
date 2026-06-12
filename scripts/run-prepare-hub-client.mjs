import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "prepare-hub-client.sh");

function resolveBash() {
  if (process.platform !== "win32") return "bash";
  const candidates = [
    process.env.BASH_PATH,
    path.join(process.env["ProgramFiles"] ?? "", "Git", "bin", "bash.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Git", "bin", "bash.exe"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "bash";
}

const result = spawnSync(resolveBash(), [script], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("Failed to execute prepare script:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
