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
const PACKAGE_JSON_PATH = fileURLToPath(
  new URL("../../../../package.json", import.meta.url)
);

const readCiWorkflow = () => readFileSync(CI_WORKFLOW_PATH, "utf8");
const readEnvExample = () => readFileSync(ENV_EXAMPLE_PATH, "utf8");
const readTurboConfig = () => readFileSync(TURBO_CONFIG_PATH, "utf8");
const readPackageJson = () => readFileSync(PACKAGE_JSON_PATH, "utf8");

const RLS_DATABASE_URL_SECRET_PATTERN =
  /DATABASE_URL:\s*\$\{\{\s*secrets\.RLS_DATABASE_URL\s*\}\}/;
const PRODUCTION_PREFLIGHT_DATABASE_URL_SECRET_PATTERN =
  /DATABASE_URL:\s*\$\{\{\s*secrets\.PRODUCTION_DATABASE_URL\s*\}\}/;
const DEPLOYMENT_SMOKE_URL_SECRET_PATTERN =
  /DEPLOYMENT_SMOKE_URL:\s*\$\{\{\s*secrets\.DEPLOYMENT_SMOKE_URL\s*\}\}/;
const INTERNAL_R2_HEALTH_SECRET_PATTERN =
  /INTERNAL_R2_HEALTH_SECRET:\s*\$\{\{\s*secrets\.INTERNAL_R2_HEALTH_SECRET\s*\}\}/;
const ADMIN_DEPLOYMENT_SMOKE_URL_SECRET_PATTERN =
  /ADMIN_DEPLOYMENT_SMOKE_URL:\s*\$\{\{\s*secrets\.ADMIN_DEPLOYMENT_SMOKE_URL\s*\}\}/;
const REMOVED_ADMIN_PERIMETER_ENV_PATTERN = /CLOUD[F]LARE_ACCESS/;

describe("CI workflow", () => {
  it("pins Bun in CI to the packageManager version", () => {
    const workflow = readCiWorkflow();
    const packageJson = JSON.parse(readPackageJson()) as {
      packageManager?: string;
    };
    const bunVersion = packageJson.packageManager?.replace("bun@", "");

    expect(bunVersion).toBe("1.3.11");
    expect(workflow).toContain("bun-version: 1.3.11");
    expect(workflow).not.toContain("bun-version: latest");
  });

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
    expect(workflow).not.toMatch(REMOVED_ADMIN_PERIMETER_ENV_PATTERN);
    expect(workflow).toContain("secrets.PRODUCTION_BETTER_AUTH_URL");
    expect(workflow).toContain("secrets.PRODUCTION_NEXT_PUBLIC_APP_URL");
    expect(workflow).toContain("secrets.GOOGLE_CLIENT_ID");
    expect(workflow).toContain("secrets.GOOGLE_CLIENT_SECRET");
    expect(workflow).toContain("secrets.INNGEST_EVENT_KEY");
    expect(workflow).toContain("secrets.INNGEST_SIGNING_KEY");
    expect(workflow).toContain("secrets.NEXT_PUBLIC_GOOGLE_CLIENT_ID");
    expect(workflow).toContain("secrets.UPSTASH_REDIS_REST_URL");
    expect(workflow).toContain("secrets.UPSTASH_REDIS_REST_TOKEN");
    expect(workflow).toContain("secrets.R2_ACCOUNT_ID");
    expect(workflow).toContain("secrets.R2_ACCESS_KEY_ID");
    expect(workflow).toContain("secrets.R2_SECRET_ACCESS_KEY");
    expect(workflow).toContain("secrets.R2_BUCKET_STAGING");
    expect(workflow).toContain("secrets.R2_BUCKET_PUBLIC");
    expect(workflow).toContain("secrets.SENTRY_DSN");
    expect(workflow).toContain("secrets.NEXT_PUBLIC_SENTRY_DSN");
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
    expect(workflow).toContain("secrets.INTERNAL_R2_HEALTH_SECRET");
    expect(workflow).toMatch(DEPLOYMENT_SMOKE_URL_SECRET_PATTERN);
    expect(workflow).toMatch(INTERNAL_R2_HEALTH_SECRET_PATTERN);
  });

  it("exposes admin deployment smoke as a manual Vercel-protection aware job", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("admin-deployment-smoke:");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("bun run deploy:smoke:admin");
    expect(workflow).toContain("secrets.ADMIN_DEPLOYMENT_SMOKE_URL");
    expect(workflow).toContain("vars.ADMIN_DEPLOYMENT_SMOKE_PROTECTED");
    expect(workflow).toMatch(ADMIN_DEPLOYMENT_SMOKE_URL_SECRET_PATTERN);
  });

  it("exposes restore drill evidence as a manual checklist job", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("restore-drill-checklist:");
    expect(workflow).toContain("bun run ops:restore-drill:checklist");
    expect(workflow).toContain("vars.RESTORE_DRILL_CONFIRMED_AT");
    expect(workflow).toContain("vars.RESTORE_DRILL_SOURCE_BRANCH");
    expect(workflow).toContain("vars.RESTORE_DRILL_RESTORE_BRANCH");
    expect(workflow).toContain("vars.RESTORE_DRILL_VALIDATED_BY");
  });

  it("runs admin checks, build and E2E as release gates", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("bun run audit:baseline");
    expect(workflow).toContain("bun run audit:boundaries");
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
      "ADMIN_DEPLOYMENT_SMOKE_URL",
      "ADMIN_DEPLOYMENT_SMOKE_PROTECTED",
      "DATABASE_POOL_MAX",
      "DEPLOYMENT_SMOKE_URL",
      "E2E_DATABASE_URL",
      "RESTORE_DRILL_CONFIRMED_AT",
      "RESTORE_DRILL_SOURCE_BRANCH",
      "RESTORE_DRILL_RESTORE_BRANCH",
      "RESTORE_DRILL_VALIDATED_BY",
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

    for (const envName of [
      "ADMIN_DEPLOYMENT_SMOKE_URL",
      "ADMIN_DEPLOYMENT_SMOKE_PROTECTED",
      "DATABASE_POOL_MAX",
    ]) {
      expect(envExample).toContain(`${envName}=`);
      expect(turboConfig).toContain(envName);
    }
  });

  it("keeps monorepo hygiene config and package typechecks wired into Turbo", () => {
    const turboConfig = JSON.parse(readTurboConfig()) as {
      globalDependencies?: string[];
      tasks?: Record<string, { dependsOn?: string[] }>;
    };

    expect(turboConfig.globalDependencies).toContain("knip.config.ts");
    expect(turboConfig.tasks?.knip?.dependsOn).toContain("^knip");
    expect(turboConfig.tasks?.typecheck?.dependsOn).toContain("^typecheck");
  });

  it("exposes all-app/package aggregate commands", () => {
    const packageJson = JSON.parse(readPackageJson()) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["build:all"]).toBe("turbo run build");
    expect(packageJson.scripts?.["audit:baseline"]).toBe(
      "bun scripts/check-bun-audit-baseline.ts"
    );
    expect(packageJson.scripts?.["audit:boundaries"]).toBe(
      "bun scripts/check-core-audit-boundaries.ts"
    );
    expect(packageJson.scripts?.["check:all"]).toBe("turbo run check");
    expect(packageJson.scripts?.["typecheck:all"]).toBe("turbo run typecheck");
    expect(packageJson.scripts?.["test:all"]).toBe("turbo run test");
  });
});
