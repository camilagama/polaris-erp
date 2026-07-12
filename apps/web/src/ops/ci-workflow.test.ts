import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CI_WORKFLOW_PATH = fileURLToPath(
  new URL("../../../../.github/workflows/ci.yml", import.meta.url)
);
const CI_WORKFLOW_TEST_PATH = fileURLToPath(
  new URL("./ci-workflow.test.ts", import.meta.url)
);
const ENV_EXAMPLE_PATH = fileURLToPath(
  new URL("../../../../.env.example", import.meta.url)
);
const TURBO_CONFIG_PATH = fileURLToPath(
  new URL("../../../../turbo.json", import.meta.url)
);
const VERCEL_WEB_CONFIG_PATH = fileURLToPath(
  new URL("../../../../apps/web/vercel.json", import.meta.url)
);
const REPOSITORY_ROOT_PATH = fileURLToPath(
  new URL("../../../../", import.meta.url)
);
const PACKAGE_JSON_PATH = fileURLToPath(
  new URL("../../../../package.json", import.meta.url)
);
const DEPLOY_RUNBOOK_PATH = fileURLToPath(
  new URL("../../../../docs/runbooks/deploy-vercel.md", import.meta.url)
);
const MANUAL_BILLING_SOP_PATH = fileURLToPath(
  new URL(
    "../../../../docs/runbooks/manual-billing-activation-sop.md",
    import.meta.url
  )
);
const POST_PR_REVIEW_REPORT_PATH = fileURLToPath(
  new URL(
    "../../../../docs/reports/post-pr-dev-review-analysis-2026-07-10.md",
    import.meta.url
  )
);
const PRODUCTION_READINESS_PLAN_PATH = fileURLToPath(
  new URL(
    "../../../../docs/superpowers/plans/2026-07-10-production-readiness-pr-plan.md",
    import.meta.url
  )
);

const readCiWorkflow = () => readFileSync(CI_WORKFLOW_PATH, "utf8");
const readDeployRunbook = () => readFileSync(DEPLOY_RUNBOOK_PATH, "utf8");
const readEnvExample = () => readFileSync(ENV_EXAMPLE_PATH, "utf8");
const readManualBillingSop = () =>
  readFileSync(MANUAL_BILLING_SOP_PATH, "utf8");
const readPostPrReviewReport = () =>
  readFileSync(POST_PR_REVIEW_REPORT_PATH, "utf8");
const readProductionReadinessPlan = () =>
  readFileSync(PRODUCTION_READINESS_PLAN_PATH, "utf8");
const readTurboConfig = () => readFileSync(TURBO_CONFIG_PATH, "utf8");
const readPackageJson = () => readFileSync(PACKAGE_JSON_PATH, "utf8");
const normalizePath = (filePath: string) =>
  filePath.replaceAll("\\", "/").replace(/\/+/g, "/");
const getFileExtension = (filePath: string) => {
  const fileName = normalizePath(filePath).split("/").at(-1) ?? "";
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex === -1 ? "" : fileName.slice(dotIndex);
};
const listActiveSourceFiles = (directoryPath: string): string[] => {
  const files: string[] = [];

  for (const directoryEntry of readdirSync(directoryPath, {
    withFileTypes: true,
  })) {
    const entryPath = `${directoryPath}/${directoryEntry.name}`;

    if (
      directoryEntry.isDirectory() &&
      !GENERATED_SOURCE_DIRECTORIES.has(directoryEntry.name)
    ) {
      files.push(...listActiveSourceFiles(entryPath));
      continue;
    }

    if (
      directoryEntry.isFile() &&
      ACTIVE_SOURCE_EXTENSIONS.has(getFileExtension(directoryEntry.name))
    ) {
      files.push(entryPath);
    }
  }

  return files;
};

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
const ACTIVE_SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const GENERATED_SOURCE_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const ACTIVE_SOURCE_ROOTS = ["apps", "packages", "scripts", ".github"];
const REMOVED_ADMIN_PERIMETER_TOKENS = [
  ["CLOUD", "FLARE_ACCESS"].join(""),
  ["Cloud", "flare Access"].join(""),
  ["cf", "-access"].join(""),
  ["cloud", "flare-access"].join(""),
  ["verify", "CloudflareAccess"].join(""),
];
const REMOVED_VERCEL_CRON_TOKENS = [
  ["CRON", "_SECRET"].join(""),
  ["E2E", "_CRON_SECRET"].join(""),
  ['"cr', 'ons"'].join(""),
];

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
    expect(workflow).toContain("vars.SUPPORT_EMAIL");
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

  it("exposes production certification evidence as a manual checklist job", () => {
    const workflow = readCiWorkflow();
    const packageJson = JSON.parse(readPackageJson()) as {
      scripts?: Record<string, string>;
    };

    expect(
      packageJson.scripts?.["ops:production-certification:checklist"]
    ).toBe("bun scripts/check-production-certification.ts");
    expect(workflow).toContain("production-certification-checklist:");
    expect(workflow).toContain(
      "bun run ops:production-certification:checklist"
    );
    expect(workflow).toContain("vars.PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT");
    expect(workflow).toContain(
      "vars.PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED"
    );
    expect(workflow).toContain(
      "vars.PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY"
    );
    expect(workflow).toContain("vars.PRODUCTION_CERT_ASAAS_SANDBOX_AT");
    expect(workflow).toContain(
      "vars.PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID"
    );
    expect(workflow).toContain("vars.PRODUCTION_CERT_INNGEST_SYNC_AT");
    expect(workflow).toContain("vars.PRODUCTION_CERT_INNGEST_RECONCILE_CRON");
    expect(workflow).toContain("vars.PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS");
    expect(workflow).toContain("vars.PRODUCTION_CERT_MANUAL_BILLING_SOP_AT");
    expect(workflow).toContain("vars.PRODUCTION_CERT_NEON_POOLER_ENABLED");
    expect(workflow).toContain(
      "vars.PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED"
    );
    expect(workflow).toContain("vars.PRODUCTION_CERT_PROVIDER_SANDBOX_AT");
    expect(workflow).toContain("vars.PRODUCTION_CERT_QUERY_PLAN_AT");
    expect(workflow).toContain("vars.PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS");
    expect(workflow).toContain("vars.PRODUCTION_CERT_QUERY_PLAN_SEARCH_TERM");
    expect(workflow).toContain("vars.PRODUCTION_CERT_R2_HEALTH_AT");
    expect(workflow).toContain("vars.PRODUCTION_CERT_RESTORE_DRILL_AT");
    expect(workflow).toContain(
      "vars.PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH"
    );
    expect(workflow).toContain(
      "vars.PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH"
    );
    expect(workflow).toContain("vars.PRODUCTION_CERT_RLS_FORCED_TABLES");
    expect(workflow).toContain("vars.PRODUCTION_CERT_SENTRY_ALERT_AT");
    expect(workflow).toContain("vars.PRODUCTION_CERT_SENTRY_EVENT_ID");
    expect(workflow).toContain("vars.PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT");
    expect(workflow).toContain("vars.PRODUCTION_CERT_VALIDATED_BY");
    expect(workflow).toContain("vars.PRODUCTION_CERT_WOOVI_SANDBOX_AT");
  });

  it("documents the controlled manual billing SOP required by certification", () => {
    const deployRunbook = readDeployRunbook();
    const manualBillingSop = readManualBillingSop();

    expect(deployRunbook).toContain(
      "docs/runbooks/manual-billing-activation-sop.md"
    );
    expect(manualBillingSop).toContain("PRODUCTION_CERT_MANUAL_BILLING_SOP_AT");
    expect(manualBillingSop).toContain(
      "PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS"
    );
    expect(manualBillingSop).toContain(
      "SLA padrao para lancamento controlado: ate 24 horas"
    );
  });

  it("keeps tenant identity docs aligned with one-user technical organization identity", () => {
    const docs = [readPostPrReviewReport(), readProductionReadinessPlan()].join(
      "\n"
    );

    for (const stalePhrase of [
      "Customers name the workspace",
      "Organization/workspace naming is product-relevant now",
      "workspaceName again",
      "organizationName again",
      "product-facing tenant identity",
      "customer-controlled organization names until a future data repair",
    ]) {
      expect(docs).not.toContain(stalePhrase);
    }

    expect(docs).toContain(
      "one-user onboarding without customer-controlled organization naming"
    );
    expect(docs).toContain("technical one-user tenant identity");
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
      "PERFORMANCE_MIN_ROWS",
      "PERFORMANCE_ORGANIZATION_ID",
      "PERFORMANCE_REQUIRE_REPRESENTATIVE",
      "PERFORMANCE_SEARCH_TERM",
      "PERFORMANCE_USER_ID",
      "PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT",
      "PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED",
      "PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY",
      "PRODUCTION_CERT_ASAAS_SANDBOX_AT",
      "PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID",
      "PRODUCTION_CERT_INNGEST_RECONCILE_CRON",
      "PRODUCTION_CERT_INNGEST_SYNC_AT",
      "PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS",
      "PRODUCTION_CERT_MANUAL_BILLING_SOP_AT",
      "PRODUCTION_CERT_NEON_POOLER_ENABLED",
      "PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED",
      "PRODUCTION_CERT_PROVIDER_SANDBOX_AT",
      "PRODUCTION_CERT_QUERY_PLAN_AT",
      "PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS",
      "PRODUCTION_CERT_QUERY_PLAN_SEARCH_TERM",
      "PRODUCTION_CERT_R2_HEALTH_AT",
      "PRODUCTION_CERT_RESTORE_DRILL_AT",
      "PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH",
      "PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH",
      "PRODUCTION_CERT_RLS_FORCED_TABLES",
      "PRODUCTION_CERT_SENTRY_ALERT_AT",
      "PRODUCTION_CERT_SENTRY_EVENT_ID",
      "PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT",
      "PRODUCTION_CERT_VALIDATED_BY",
      "PRODUCTION_CERT_WOOVI_SANDBOX_AT",
      "RESTORE_DRILL_CONFIRMED_AT",
      "RESTORE_DRILL_SOURCE_BRANCH",
      "RESTORE_DRILL_RESTORE_BRANCH",
      "RESTORE_DRILL_VALIDATED_BY",
      "RLS_DATABASE_URL",
      "SUPPORT_EMAIL",
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
      "PERFORMANCE_MIN_ROWS",
      "PERFORMANCE_ORGANIZATION_ID",
      "PERFORMANCE_REQUIRE_REPRESENTATIVE",
      "PERFORMANCE_SEARCH_TERM",
      "PERFORMANCE_USER_ID",
      "SUPPORT_EMAIL",
    ]) {
      expect(envExample).toContain(`${envName}=`);
      expect(turboConfig).toContain(envName);
    }
  });

  it("keeps product image reconcile scheduling on Inngest instead of Vercel Cron", () => {
    if (!existsSync(VERCEL_WEB_CONFIG_PATH)) {
      expect(existsSync(VERCEL_WEB_CONFIG_PATH)).toBe(false);
      return;
    }

    const vercelConfig = readFileSync(VERCEL_WEB_CONFIG_PATH, "utf8");

    expect(vercelConfig).not.toContain('"crons"');
    expect(vercelConfig).not.toContain(
      "/api/internal/product-images/reconcile"
    );
  });

  it("keeps removed admin perimeter code out of active source", () => {
    const activeSourceFiles = ACTIVE_SOURCE_ROOTS.flatMap((rootPath) =>
      listActiveSourceFiles(`${REPOSITORY_ROOT_PATH}/${rootPath}`)
    );

    const matches = activeSourceFiles.flatMap((sourceFilePath) => {
      const source = readFileSync(sourceFilePath, "utf8");

      return REMOVED_ADMIN_PERIMETER_TOKENS.filter((token) =>
        source.includes(token)
      ).map((token) => ({
        sourceFilePath,
        token,
      }));
    });

    expect(matches).toEqual([]);
  });

  it("keeps legacy Vercel Cron secrets and config out of active source", () => {
    const activeSourceFiles = ACTIVE_SOURCE_ROOTS.flatMap((rootPath) =>
      listActiveSourceFiles(`${REPOSITORY_ROOT_PATH}/${rootPath}`)
    ).filter(
      (sourceFilePath) =>
        normalizePath(sourceFilePath) !== normalizePath(CI_WORKFLOW_TEST_PATH)
    );

    const matches = activeSourceFiles.flatMap((sourceFilePath) => {
      const source = readFileSync(sourceFilePath, "utf8");

      return REMOVED_VERCEL_CRON_TOKENS.filter((token) =>
        source.includes(token)
      ).map((token) => ({
        sourceFilePath,
        token,
      }));
    });

    expect(matches).toEqual([]);
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
