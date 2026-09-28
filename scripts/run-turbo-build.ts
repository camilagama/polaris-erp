import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..");
const SENTRY_UPLOAD_ENV_NAMES = [
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
] as const;
const BUILD_TARGETS: Record<string, string[]> = {
  admin: ["--filter=@polaris/admin"],
  all: [],
  web: ["--filter=@polaris/web"],
};
const BUILD_ENV_FILES: Record<string, string[]> = {
  admin: [
    ".env.local",
    "apps/admin/.env",
    "apps/admin/.env.local",
    "apps/admin/.env.production",
    "apps/admin/.env.production.local",
  ],
  all: [
    ".env.local",
    "apps/web/.env",
    "apps/web/.env.local",
    "apps/web/.env.production",
    "apps/web/.env.production.local",
    "apps/admin/.env",
    "apps/admin/.env.local",
    "apps/admin/.env.production",
    "apps/admin/.env.production.local",
  ],
  web: [
    ".env.local",
    "apps/web/.env",
    "apps/web/.env.local",
    "apps/web/.env.production",
    "apps/web/.env.production.local",
  ],
};

const hasCompleteSentryUploadConfig = (target: string): boolean => {
  const configuredNames = new Set<string>();

  for (const name of SENTRY_UPLOAD_ENV_NAMES) {
    if (process.env[name]) {
      configuredNames.add(name);
    }
  }

  for (const relativePath of BUILD_ENV_FILES[target] ?? []) {
    const envPath = resolve(REPOSITORY_ROOT, relativePath);

    if (!existsSync(envPath)) {
      continue;
    }

    const fileEnv = parse(readFileSync(envPath, "utf8"));

    for (const name of SENTRY_UPLOAD_ENV_NAMES) {
      if (fileEnv[name]) {
        configuredNames.add(name);
      }
    }
  }

  return SENTRY_UPLOAD_ENV_NAMES.every((name) => configuredNames.has(name));
};

const requestedTarget = process.argv[2] ?? "";
const targetArgs = BUILD_TARGETS[requestedTarget];

if (!targetArgs) {
  throw new Error("Usage: bun scripts/run-turbo-build.ts <web|admin|all>");
}

const sentryUploadConfigured = hasCompleteSentryUploadConfig(requestedTarget);
const turboArgs = ["x", "turbo", "run", "build", ...targetArgs];

if (sentryUploadConfigured) {
  // --force skips cache reads; source-map outputs are deleted/excluded separately.
  turboArgs.push("--force");
  console.log("Sentry upload is configured; forcing the build to execute.");
}

const result = spawnSync("bun", turboArgs, {
  cwd: REPOSITORY_ROOT,
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  console.error(`Could not start Bun: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
