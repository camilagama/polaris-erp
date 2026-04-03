import { defineConfig } from "@playwright/test";

const e2eBootstrapSecret = process.env.CRON_SECRET ?? "dgimports-e2e-bootstrap";

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
    env: {
      ...process.env,
      CRON_SECRET: e2eBootstrapSecret,
    },
    port: 3001,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
