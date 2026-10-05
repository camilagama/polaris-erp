import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";

if (process.env.CI === "true" || process.env.VERCEL === "1") {
  process.exit(0);
}

let gitMetadataIsDirectory = false;
try {
  gitMetadataIsDirectory = statSync(".git").isDirectory();
} catch {
  process.exit(0);
}

if (!gitMetadataIsDirectory) {
  process.exit(0);
}

const result = spawnSync("bun", ["x", "lefthook", "install"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
