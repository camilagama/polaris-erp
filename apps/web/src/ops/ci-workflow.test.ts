import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CI_WORKFLOW_PATH = fileURLToPath(
  new URL("../../../../.github/workflows/ci.yml", import.meta.url)
);
const OPERATIONS_WORKFLOW_PATH = fileURLToPath(
  new URL("../../../../.github/workflows/operations.yml", import.meta.url)
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
const readOperationsWorkflow = () =>
  readFileSync(OPERATIONS_WORKFLOW_PATH, "utf8");
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
const TOP_LEVEL_WORKFLOW_JOB_PATTERN = /^ {2}[a-z0-9_-]+:$/i;
const WORKFLOW_LINE_SEPARATOR_PATTERN = /\r?\n/;
const normalizePath = (filePath: string) =>
  filePath.replaceAll("\\", "/").replace(/\/+/g, "/");
const getWorkflowJobSection = (workflow: string, jobId: string) => {
  const lines = workflow.split(WORKFLOW_LINE_SEPARATOR_PATTERN);
  const jobStartIndex = lines.indexOf(`  ${jobId}:`);

  if (jobStartIndex === -1) {
    return "";
  }

  const nextJobStartIndex = lines.findIndex(
    (line, index) =>
      index > jobStartIndex && TOP_LEVEL_WORKFLOW_JOB_PATTERN.test(line)
  );

  return lines
    .slice(
      jobStartIndex,
      nextJobStartIndex === -1 ? undefined : nextJobStartIndex
    )
    .join("\n");
};
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

const ADMIN_E2E_DATABASE_URL_SECRET_PATTERN =
  /admin-e2e:[\s\S]*E2E_DATABASE_URL:\s*\$\{\{\s*secrets\.ADMIN_E2E_DATABASE_URL\s*\}\}/;
const TOP_LEVEL_WORKFLOW_PERMISSIONS_PATTERN =
  /^permissions:\r?\n {2}contents: read$/m;
const VALIDATE_DISPATCH_NO_TOKEN_PERMISSIONS_PATTERN =
  / {2}validate-dispatch:\r?\n {4}if:.*\r?\n {4}permissions: \{\}/;
const PERSIST_CREDENTIALS_DISABLED_PATTERN =
  /^ {10}persist-credentials: false\r?$/gm;
const PINNED_WORKFLOW_REFERENCE_PATTERN = /^[^/@]+\/[^@]+@[a-f0-9]{40}$/i;
const WORKFLOW_RELEASE_COMMENT_PATTERN = /^v\d+\.\d+\.\d+$/;
const PRODUCTION_MIGRATION_PERMISSIONS_PATTERN = new RegExp(
  ["permissions:", " {6}contents: read"].join("\\r?\\n")
);
const DATABASE_DIRECT_SECRET_REFERENCE_PATTERN =
  /secrets\.DATABASE_URL_DIRECT/g;
const GITHUB_WORKFLOW_EXPRESSION = ["$", "{{ github.workflow }}"].join("");
const GITHUB_PR_REF_EXPRESSION = [
  "$",
  "{{ github.event.pull_request.number || github.ref }}",
].join("");
const PRODUCTION_MIGRATION_TARGET_CONFIRMATION_EXPRESSION = [
  "$",
  "{{ inputs.target_confirmation }}",
].join("");
const PRODUCTION_MIGRATION_SHA_EXPRESSION = [
  "$",
  "{{ inputs.release_sha }}",
].join("");
const PRODUCTION_MIGRATION_GROUP_EXPECTATION = [
  "group: production-migration-",
  "$",
  "{{ vars.PRODUCTION_NEON_PROJECT_ID }}",
  "-",
  "$",
  "{{ vars.PRODUCTION_NEON_BRANCH_ID }}",
].join("");
const getExternalWorkflowUses = (workflow: string) =>
  Array.from(
    workflow.matchAll(
      /^\s*(?:-\s*)?uses:\s+([^\s#]+)(?:\s+#\s*([^\s#]+))?\s*$/gm
    )
  ).filter((match) => {
    const reference = match[1] ?? "";

    return !(reference.startsWith("./") || reference.startsWith("docker://"));
  });
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
    const operationsWorkflow = readOperationsWorkflow();
    const packageJson = JSON.parse(readPackageJson()) as {
      packageManager?: string;
    };
    const bunVersion = packageJson.packageManager?.replace("bun@", "");

    expect(bunVersion).toBe("1.4.2");
    expect(workflow).toContain("bun-version: 1.4.2");
    expect(workflow).not.toContain("bun-version: latest");
    expect(operationsWorkflow).toContain("bun-version: 1.4.2");
    expect(operationsWorkflow).not.toContain("bun-version: latest");
  });

  it("keeps manual operations single-selected and main-only, scoping migration credentials to its job", () => {
    const ciWorkflow = readCiWorkflow();
    const operationsWorkflow = readOperationsWorkflow();
    const operations = [
      "rls-smoke",
      "restore-drill-checklist",
      "production-certification-checklist",
      "deployment-smoke",
      "admin-deployment-smoke",
      "production-preflight",
      "production-migration",
    ];
    const productionEnvironmentOperations = [
      "rls-smoke",
      "deployment-smoke",
      "admin-deployment-smoke",
      "production-preflight",
      "production-migration",
    ];
    const secretlessOperations = operations.filter(
      (operation) => operation !== "production-migration"
    );
    const evidenceOnlyOperations = [
      "restore-drill-checklist",
      "production-certification-checklist",
    ];

    expect(ciWorkflow).not.toContain("workflow_dispatch:");
    expect(ciWorkflow).not.toContain("production-preflight:");
    expect(operationsWorkflow).toContain("workflow_dispatch:");
    expect(operationsWorkflow).toContain("type: choice");
    expect(operationsWorkflow).toContain("required: true");
    expect(operationsWorkflow).toContain("default: select-operation");
    expect(operationsWorkflow).toContain("- select-operation");
    expect(operationsWorkflow).toContain("refs/heads/main");
    expect(operationsWorkflow).toContain("Select one operation");
    expect(operationsWorkflow).not.toContain("  push:");
    expect(operationsWorkflow).not.toContain("  pull_request:");
    expect(ciWorkflow).not.toContain("secrets.DATABASE_URL_DIRECT");
    expect(
      getWorkflowJobSection(operationsWorkflow, "validate-dispatch")
    ).not.toContain("environment:");

    for (const operation of productionEnvironmentOperations) {
      expect(getWorkflowJobSection(operationsWorkflow, operation)).toContain(
        "environment: Production"
      );
    }

    for (const operation of evidenceOnlyOperations) {
      expect(
        getWorkflowJobSection(operationsWorkflow, operation)
      ).not.toContain("environment:");
    }

    for (const operation of secretlessOperations) {
      expect(
        getWorkflowJobSection(operationsWorkflow, operation)
      ).not.toContain("secrets.");
    }

    const productionMigrationJob = getWorkflowJobSection(
      operationsWorkflow,
      "production-migration"
    );
    expect(productionMigrationJob).toContain("secrets.DATABASE_URL_DIRECT");
    expect(productionMigrationJob).toContain("environment: Production");
    expect(productionMigrationJob).toMatch(
      PRODUCTION_MIGRATION_PERMISSIONS_PATTERN
    );
    expect(
      operationsWorkflow.match(DATABASE_DIRECT_SECRET_REFERENCE_PATTERN)
    ).toHaveLength(2);
    expect(productionMigrationJob).toContain(
      `PRODUCTION_MIGRATION_TARGET_CONFIRMATION: ${PRODUCTION_MIGRATION_TARGET_CONFIRMATION_EXPRESSION}`
    );
    expect(productionMigrationJob).toContain(
      `PRODUCTION_MIGRATION_SHA: ${PRODUCTION_MIGRATION_SHA_EXPRESSION}`
    );
    expect(productionMigrationJob).toContain(
      "bun scripts/check-production-migration-target.ts"
    );
    expect(productionMigrationJob).toContain("bun run db:migrate");
    expect(productionMigrationJob).toContain("cancel-in-progress: false");
    expect(productionMigrationJob).toContain(
      PRODUCTION_MIGRATION_GROUP_EXPECTATION
    );
    expect(ciWorkflow).not.toContain("bun run db:migrate");

    for (const operation of operations) {
      expect(ciWorkflow).not.toContain(`${operation}:`);
      expect(operationsWorkflow).toContain(`${operation}:`);
      expect(operationsWorkflow).toContain(
        `inputs.operation == '${operation}'`
      );
      expect(operationsWorkflow).toContain(
        `if: \${{ github.ref == 'refs/heads/main' && inputs.operation == '${operation}' }}`
      );
    }

    expect(operationsWorkflow).toContain(
      `if: \${{ github.ref != 'refs/heads/main' || inputs.operation == 'select-operation' }}`
    );
  });

  it("limits workflow tokens to read-only repository contents and avoids persisting checkout credentials", () => {
    const workflows = [readCiWorkflow(), readOperationsWorkflow()];
    const ciWorkflow = workflows[0] ?? "";
    const operationsWorkflow = workflows[1] ?? "";

    for (const workflow of workflows) {
      expect(workflow).toMatch(TOP_LEVEL_WORKFLOW_PERMISSIONS_PATTERN);
      expect(workflow).not.toContain("contents: write");
      expect(workflow).not.toContain("read-all");
      expect(workflow).not.toContain("write-all");
    }

    expect(ciWorkflow.match(/^ {6}- uses: actions\/checkout@/gm)).toHaveLength(
      4
    );
    expect(ciWorkflow.match(PERSIST_CREDENTIALS_DISABLED_PATTERN)).toHaveLength(
      4
    );
    expect(
      operationsWorkflow.match(/^ {6}- uses: actions\/checkout@/gm)
    ).toHaveLength(7);
    expect(
      operationsWorkflow.match(PERSIST_CREDENTIALS_DISABLED_PATTERN)
    ).toHaveLength(7);
    expect(operationsWorkflow).toMatch(
      VALIDATE_DISPATCH_NO_TOKEN_PERMISSIONS_PATTERN
    );
  });

  it("pins every external workflow dependency to a full commit SHA with a release comment", () => {
    const workflows = [
      { content: readCiWorkflow(), expectedCount: 12 },
      { content: readOperationsWorkflow(), expectedCount: 19 },
    ];

    for (const workflow of workflows) {
      const externalUses = getExternalWorkflowUses(workflow.content);

      expect(externalUses).toHaveLength(workflow.expectedCount);

      for (const [, reference, version] of externalUses) {
        expect(reference).toMatch(PINNED_WORKFLOW_REFERENCE_PATTERN);
        expect(version).toMatch(WORKFLOW_RELEASE_COMMENT_PATTERN);
      }
    }
  });

  it("cancels stale local CI jobs without cancelling E2E or operations", () => {
    const ciWorkflow = readCiWorkflow();
    const operationsWorkflow = readOperationsWorkflow();
    const verifyJob = getWorkflowJobSection(ciWorkflow, "verify");
    const postgresBehaviorJob = getWorkflowJobSection(
      ciWorkflow,
      "postgres-behavior"
    );

    expect(verifyJob).toContain(
      `group: ci-${GITHUB_WORKFLOW_EXPRESSION}-verify-${GITHUB_PR_REF_EXPRESSION}`
    );
    expect(verifyJob).toContain("cancel-in-progress: true");
    expect(postgresBehaviorJob).toContain(
      `group: ci-${GITHUB_WORKFLOW_EXPRESSION}-postgres-behavior-${GITHUB_PR_REF_EXPRESSION}`
    );
    expect(postgresBehaviorJob).toContain("cancel-in-progress: true");
    expect(getWorkflowJobSection(ciWorkflow, "e2e")).not.toContain(
      "concurrency:"
    );
    expect(getWorkflowJobSection(ciWorkflow, "admin-e2e")).not.toContain(
      "concurrency:"
    );
    const productionMigrationJob = getWorkflowJobSection(
      operationsWorkflow,
      "production-migration"
    );
    expect(productionMigrationJob).toContain("concurrency:");
    expect(productionMigrationJob).toContain("cancel-in-progress: false");
    for (const operation of [
      "rls-smoke",
      "restore-drill-checklist",
      "production-certification-checklist",
      "deployment-smoke",
      "admin-deployment-smoke",
      "production-preflight",
    ]) {
      expect(
        getWorkflowJobSection(operationsWorkflow, operation)
      ).not.toContain("concurrency:");
    }
  });

  it("exposes RLS smoke as a selected operation without a database URL before P24", () => {
    const workflow = readOperationsWorkflow();

    expect(workflow).toContain("rls-smoke:");
    expect(workflow).toContain("inputs.operation == 'rls-smoke'");
    expect(workflow).toContain("bun run db:smoke:rls");
    expect(workflow).toContain('DATABASE_URL: ""');
    expect(workflow).not.toContain("secrets.RLS_DATABASE_URL");
  });

  it("exposes production preflight from operations without production secrets yet", () => {
    const workflow = readOperationsWorkflow();

    expect(workflow).toContain("production-preflight:");
    expect(workflow).toContain("inputs.operation == 'production-preflight'");
    expect(workflow).toContain("bun run prod:preflight");
    expect(workflow).toContain("vars.SUPPORT_EMAIL");
    expect(workflow).toContain('DATABASE_URL: ""');
    expect(workflow).toContain('DATABASE_URL_DIRECT: ""');
    expect(workflow).toContain('RLS_DATABASE_URL: ""');
    expect(workflow).toContain('DEPLOYMENT_SMOKE_URL: ""');
    expect(workflow).not.toMatch(REMOVED_ADMIN_PERIMETER_ENV_PATTERN);
    expect(
      getWorkflowJobSection(workflow, "production-preflight")
    ).not.toContain("secrets.");
  });

  it("exposes deployment smoke operations without connecting them before P24", () => {
    const workflow = readOperationsWorkflow();

    expect(workflow).toContain("deployment-smoke:");
    expect(workflow).toContain("inputs.operation == 'deployment-smoke'");
    expect(workflow).toContain("bun run deploy:smoke");
    expect(workflow).toContain('DEPLOYMENT_SMOKE_URL: ""');
    expect(workflow).toContain('INTERNAL_R2_HEALTH_SECRET: ""');
    expect(workflow).toContain("admin-deployment-smoke:");
    expect(workflow).toContain("inputs.operation == 'admin-deployment-smoke'");
    expect(workflow).toContain("bun run deploy:smoke:admin");
    expect(workflow).toContain("vars.ADMIN_DEPLOYMENT_SMOKE_PROTECTED");
    expect(workflow).toContain('ADMIN_DEPLOYMENT_SMOKE_URL: ""');
  });

  it("exposes restore drill evidence as a manual checklist job", () => {
    const workflow = readOperationsWorkflow();

    expect(workflow).toContain("restore-drill-checklist:");
    expect(workflow).toContain("bun run ops:restore-drill:checklist");
    expect(workflow).toContain("vars.RESTORE_DRILL_CONFIRMED_AT");
    expect(workflow).toContain("vars.RESTORE_DRILL_SOURCE_BRANCH");
    expect(workflow).toContain("vars.RESTORE_DRILL_RESTORE_BRANCH");
    expect(workflow).toContain("vars.RESTORE_DRILL_VALIDATED_BY");
  });

  it("exposes production certification evidence as a manual checklist job", () => {
    const workflow = readOperationsWorkflow();
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
    expect(workflow).toContain("secrets.ADMIN_E2E_DATABASE_URL");
    expect(workflow).toMatch(ADMIN_E2E_DATABASE_URL_SECRET_PATTERN);
  });

  it("runs PostgreSQL behavior checks on the current stable PostgreSQL 18 patch", () => {
    const workflow = readCiWorkflow();

    expect(workflow).toContain("image: postgres:18.6");
    expect(workflow).not.toContain("image: postgres:16");
    expect(workflow).toContain("bun run test:postgres");
    expect(workflow).toContain(
      '--health-cmd "pg_isready -U postgres -d polaris_behavior"'
    );
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
      "POSTGRES_BEHAVIOR_DATABASE_URL",
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
      tasks?: Record<string, { dependsOn?: string[]; inputs?: string[] }>;
    };

    expect(turboConfig.tasks?.["@polaris/web#knip"]?.inputs).toContain(
      "$TURBO_ROOT$/knip.config.ts"
    );
    expect(turboConfig.tasks?.knip?.dependsOn).toContain("^knip");
    expect(turboConfig.tasks?.typecheck?.dependsOn).toContain("^typecheck");
  });

  it("exposes all-app/package aggregate commands", () => {
    const packageJson = JSON.parse(readPackageJson()) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["build:all"]).toBe(
      "bun scripts/run-turbo-build.ts all"
    );
    expect(packageJson.scripts?.["audit:baseline"]).toBe(
      "bun scripts/check-bun-audit-baseline.ts"
    );
    expect(packageJson.scripts?.["audit:boundaries"]).toBe(
      "bun scripts/check-core-audit-boundaries.ts"
    );
    expect(packageJson.scripts?.["check:all"]).toBe("turbo run check");
    expect(packageJson.scripts?.["typecheck:all"]).toBe("turbo run typecheck");
    expect(packageJson.scripts?.["test:all"]).toBe("turbo run test");
    expect(packageJson.scripts?.["verify:quick"]).toBe(
      "bun scripts/verify.ts quick"
    );
    expect(packageJson.scripts?.verify).toBe("bun scripts/verify.ts full");
  });
});
