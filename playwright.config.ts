import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";
import { validateE2eDatabaseEnv } from "./src/lib/playwright-env";
import {
  E2E_DEFAULT_CRON_SECRET,
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
} from "./tests/e2e/constants";

loadEnvConfig(process.cwd());

const isCi = process.env.CI === "true";
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
const allowSharedDb = process.env.ALLOW_E2E_SHARED_DATABASE === "true";

validateE2eDatabaseEnv(process.env);

if (!(e2eDatabaseUrl || allowSharedDb || isCi)) {
  // eslint-disable-next-line no-console -- aviso operacional para dev local
  console.warn(
    "[playwright] Defina E2E_DATABASE_URL para um banco isolado. Sem isso, os E2E usam DATABASE_URL do ambiente (risco de poluir dados reais). Veja docs/database-environments.md."
  );
}

const e2eCronSecret = process.env.E2E_CRON_SECRET ?? E2E_DEFAULT_CRON_SECRET;
const e2eInternalBootstrapSecret =
  process.env.E2E_INTERNAL_BOOTSTRAP_SECRET ??
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET;

const processEnvWithE2eOverrides: NodeJS.ProcessEnv = {
  ...process.env,
  ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
  CRON_SECRET: e2eCronSecret,
  INTERNAL_BOOTSTRAP_SECRET: e2eInternalBootstrapSecret,
  NODE_ENV: "production",
};

if (e2eDatabaseUrl) {
  processEnvWithE2eOverrides.DATABASE_URL = e2eDatabaseUrl;
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

const webServerEnv = toPlaywrightStringEnv(processEnvWithE2eOverrides);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run build && bun x next start --port 3001",
    env: webServerEnv,
    port: 3001,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
