import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";
import { validateE2eDatabaseEnv } from "../web/src/ops/playwright-env";
import { E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET } from "../web/tests/e2e/constants";

loadEnvConfig("../..");
loadEnvConfig(process.cwd());

const isCi = process.env.CI === "true";
const isStaticAnalysis = process.argv.some((arg) => arg.includes("knip"));
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;

if (!isStaticAnalysis) {
  validateE2eDatabaseEnv(process.env);
}

if (
  !(
    isStaticAnalysis ||
    e2eDatabaseUrl ||
    process.env.ALLOW_E2E_SHARED_DATABASE ||
    isCi
  )
) {
  throw new Error(
    "Admin E2E exige E2E_DATABASE_URL apontando para banco isolado."
  );
}

const toPlaywrightStringEnv = (
  env: NodeJS.ProcessEnv
): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};

const webServerEnv = toPlaywrightStringEnv({
  ...process.env,
  ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
  DATABASE_URL: e2eDatabaseUrl ?? process.env.DATABASE_URL,
  INTERNAL_BOOTSTRAP_SECRET:
    process.env.E2E_INTERNAL_BOOTSTRAP_SECRET ??
    E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  NODE_ENV: "production",
});

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3002",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run build && bun x next start --port 3002",
    env: webServerEnv,
    port: 3002,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
