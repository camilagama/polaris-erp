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
