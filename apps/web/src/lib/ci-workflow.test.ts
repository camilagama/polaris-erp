import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CI_WORKFLOW_PATH = fileURLToPath(
  new URL("../../../../.github/workflows/ci.yml", import.meta.url)
);

const readCiWorkflow = () => readFileSync(CI_WORKFLOW_PATH, "utf8");

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
});
