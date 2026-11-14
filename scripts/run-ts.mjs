// Runs a TypeScript file from this project in Node (the balance check, the tests).
// It bundles the file with rolldown (it comes with Vite) and replaces `import.meta.env` with { DEV: false },
// then runs the result. Usage: node scripts/run-ts.mjs <file.ts> [--test]
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "rolldown";

const [entry, ...rest] = process.argv.slice(2);
if (!entry) {
  console.error("Usage: node scripts/run-ts.mjs <file.ts> [--test]");
  process.exit(1);
}
const out = join(mkdtempSync(join(tmpdir(), "ares-")), "run.mjs");
await build({
  input: entry,
  platform: "node",
  transform: { define: { "import.meta.env": JSON.stringify({ DEV: false, BASE_URL: "/" }) } },
  output: { file: out, format: "esm" },
  logLevel: "warn",
});
const args = rest.includes("--test") ? ["--test", out] : [out];
const run = spawnSync(process.execPath, ["--max-old-space-size=4096", ...args], { stdio: "inherit" });
process.exit(run.status ?? 1);
