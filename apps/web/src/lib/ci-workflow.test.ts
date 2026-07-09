import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CI_WORKFLOW_PATH = fileURLToPath(
  new URL("../../../../.github/workflows/ci.yml", import.meta.url)
);
const ENV_EXAMPLE_PATH = fileURLToPath(
  new URL("../../../../.env.example", import.meta.url)
);
const TURBO_CONFIG_PATH = fileURLToPath(
  new URL("../../../../turbo.json", import.meta.url)
);

const readCiWorkflow = () => readFileSync(CI_WORKFLOW_PATH, "utf8");
const readEnvExample = () => readFileSync(ENV_EXAMPLE_PATH, "utf8");
const readTurboConfig = () => readFileSync(TURBO_CONFIG_PATH, "utf8");

const RLS_DATABASE_URL_SECRET_PATTERN =
  /DATABASE_URL:\s*\$\{\{\s*secrets\.RLS_DATABASE_URL\s*\}\}/;
const PRODUCTION_PREFLIGHT_DATABASE_URL_SECRET_PATTERN =
  /DATABASE_URL:\s*\$\{\{\s*secrets\.PRODUCTION_DATABASE_URL\s*\}\}/;
const DEPLOYMENT_SMOKE_URL_SECRET_PATTERN =
  /DEPLOYMENT_SMOKE_URL:\s*\$\{\{\s*secrets\.DEPLOYMENT_SMOKE_URL\s*\}\}/;
const CRON_SECRET_PATTERN =
  /CRON_SECRET:\s*\$\{\{\s*secrets\.CRON_SECRET\s*\}\}/;

describe("CI workflow", () => {
  it("exposes RLS smoke as a manual secret-gated job", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("rls-smoke:");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("secrets.RLS_DATABASE_URL");
    expect(workflow).toMatch(RLS_DATABASE_URL_SECRET_PATTERN);
    expect(workflow).toContain("bun run db:smoke:rls");
  });

  it("exposes production preflight as a manual secret-gated job", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("production-preflight:");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("bun run prod:preflight");
    expect(workflow).toContain("secrets.PRODUCTION_DATABASE_URL");
    expect(workflow).toContain("secrets.PRODUCTION_DATABASE_URL_DIRECT");
    expect(workflow).toContain("secrets.ADMIN_APP_URL");
    expect(workflow).toContain("secrets.CLOUDFLARE_ACCESS_AUD");
    expect(workflow).toContain("secrets.CLOUDFLARE_ACCESS_TEAM_DOMAIN");
    expect(workflow).toContain("secrets.PRODUCTION_BETTER_AUTH_URL");
    expect(workflow).toContain("secrets.PRODUCTION_NEXT_PUBLIC_APP_URL");
    expect(workflow).toContain("secrets.GOOGLE_CLIENT_ID");
    expect(workflow).toContain("secrets.GOOGLE_CLIENT_SECRET");
    expect(workflow).toContain("secrets.NEXT_PUBLIC_GOOGLE_CLIENT_ID");
    expect(workflow).toContain("secrets.UPSTASH_REDIS_REST_URL");
    expect(workflow).toContain("secrets.UPSTASH_REDIS_REST_TOKEN");
    expect(workflow).toContain("secrets.R2_ACCOUNT_ID");
    expect(workflow).toContain("secrets.R2_ACCESS_KEY_ID");
    expect(workflow).toContain("secrets.R2_SECRET_ACCESS_KEY");
    expect(workflow).toContain("secrets.R2_BUCKET_STAGING");
    expect(workflow).toContain("secrets.R2_BUCKET_PUBLIC");
    expect(workflow).toContain("secrets.DEPLOYMENT_SMOKE_URL");
    expect(workflow).toContain("secrets.E2E_DATABASE_URL");
    expect(workflow).toContain("secrets.RLS_DATABASE_URL");
    expect(workflow).toMatch(PRODUCTION_PREFLIGHT_DATABASE_URL_SECRET_PATTERN);
    expect(workflow).toMatch(DEPLOYMENT_SMOKE_URL_SECRET_PATTERN);
  });

  it("exposes deployment smoke as a manual secret-gated job", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("deployment-smoke:");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("bun run deploy:smoke");
    expect(workflow).toContain("secrets.DEPLOYMENT_SMOKE_URL");
    expect(workflow).toContain("secrets.CRON_SECRET");
    expect(workflow).toMatch(DEPLOYMENT_SMOKE_URL_SECRET_PATTERN);
    expect(workflow).toMatch(CRON_SECRET_PATTERN);
  });

  it("runs admin checks, build and E2E as release gates", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("bun run check:admin");
    expect(workflow).toContain("bun run typecheck");
    expect(workflow).toContain("bun run typecheck:admin");
    expect(workflow).toContain("bun run build:admin");
    expect(workflow).toContain("admin-e2e:");
    expect(workflow).toContain("bun run test:e2e:admin");
    expect(workflow).toContain("secrets.E2E_DATABASE_URL");
  });

  it("documents production preflight envs in the env example", () => {
    const envExample = readEnvExample();

    for (const envName of [
      "ADMIN_APP_URL",
      "CLOUDFLARE_ACCESS_AUD",
      "CLOUDFLARE_ACCESS_TEAM_DOMAIN",
      "DEPLOYMENT_SMOKE_URL",
      "E2E_DATABASE_URL",
      "RLS_DATABASE_URL",
    ]) {
      expect(envExample).toContain(`${envName}=`);
    }
  });

  it("documents and passes Inngest envs through Turbo tasks", () => {
    const envExample = readEnvExample();
    const turboConfig = readTurboConfig();

    for (const envName of ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"]) {
      expect(envExample).toContain(`${envName}=`);
      expect(turboConfig).toContain(envName);
    }
  });
});
