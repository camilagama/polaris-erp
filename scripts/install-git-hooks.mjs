import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (process.env.CI === "true" || process.env.VERCEL === "1") {
  process.exit(0);
}

if (!existsSync(".git")) {
  process.exit(0);
}

const result = spawnSync("bun", ["x", "lefthook", "install"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
