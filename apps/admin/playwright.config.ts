import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";
import {
  createE2eServerEnv,
  E2E_ADMIN_BASE_URL,
  sanitizeE2eRunnerEnvironment,
} from "@polaris/e2e-support";

loadEnvConfig("../..");
loadEnvConfig(process.cwd());

const isStaticAnalysis = process.argv.some((arg) => arg.includes("knip"));
const webServerEnv = isStaticAnalysis
  ? {}
  : createE2eServerEnv(process.env, "admin");

if (!isStaticAnalysis) {
  sanitizeE2eRunnerEnvironment(process.env);
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  updateSnapshots: "none",
  outputDir: "test-results",
  reporter: process.env.CI
    ? [
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "test-results/report.json" }],
      ]
    : "list",
  use: {
    baseURL: E2E_ADMIN_BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    command: "bun run build && bun x next start --port 3002",
    env: webServerEnv,
    port: 3002,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
