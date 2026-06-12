import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function resolveEntry(pkg) {
  const exportsRoot = pkg.exports;
  if (typeof exportsRoot === "string") {
    return exportsRoot.replace(/^\.\//, "");
  }
  const dot = exportsRoot?.["."];
  if (typeof dot === "string") {
    return dot.replace(/^\.\//, "");
  }
  if (dot && typeof dot === "object") {
    const candidate = dot.import ?? dot.default ?? dot.require;
    if (typeof candidate === "string") {
      return candidate.replace(/^\.\//, "");
    }
  }
  return (pkg.main || "").replace(/^\.\//, "");
}

const dir = process.argv[2];
if (!dir) process.exit(1);

const pkgPath = join(dir, "package.json");
if (!existsSync(pkgPath)) process.exit(1);
try {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const entry = resolveEntry(pkg);
  process.exit(entry && existsSync(join(dir, entry)) ? 0 : 1);
} catch {
  process.exit(1);
}
