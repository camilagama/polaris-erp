import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";
import { createE2eServerEnv } from "@polaris/e2e-support";

loadEnvConfig("../..");
loadEnvConfig(process.cwd());

const isStaticAnalysis = process.argv.some((arg) => arg.includes("knip"));
const webServerEnv = isStaticAnalysis ? {} : createE2eServerEnv(process.env);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun x next build && bun x next start --port 3001",
    env: webServerEnv,
    port: 3001,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
