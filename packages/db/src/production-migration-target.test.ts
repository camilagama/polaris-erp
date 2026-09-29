import { describe, expect, it } from "vitest";

type MigrationTargetInput = Record<string, string | undefined>;

interface MigrationTargetEvidence {
  branchId: string;
  databaseName: string;
  directHostMatches: true;
  migrationRole: string;
  projectId: string;
  releaseSha: string;
}

interface MigrationTargetModule {
  validateProductionMigrationTarget: (
    env: MigrationTargetInput
  ) => MigrationTargetEvidence;
}

const loadValidator = async (): Promise<
  MigrationTargetModule["validateProductionMigrationTarget"]
> => {
  const moduleUrl = new URL(
    "./production-migration-target.ts",
    import.meta.url
  );
  const migrationTargetModule = (await import(moduleUrl.href).catch(
    () => null
  )) as MigrationTargetModule | null;

  expect(migrationTargetModule).not.toBeNull();
  expect(migrationTargetModule?.validateProductionMigrationTarget).toBeTypeOf(
    "function"
  );

  if (!migrationTargetModule) {
    throw new Error("Production migration target validator is missing.");
  }

  return migrationTargetModule.validateProductionMigrationTarget;
};

const makeMigrationTarget = (
  overrides: Partial<MigrationTargetInput> = {}
): MigrationTargetInput => ({
  DATABASE_URL_DIRECT:
    "postgresql://polaris_migrator:synthetic-password@ep-prod-example.sa-east-1.aws.neon.tech/polaris?sslmode=verify-full",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: "a".repeat(40),
  PRODUCTION_DATABASE_HOST: "ep-prod-example.sa-east-1.aws.neon.tech",
  PRODUCTION_DATABASE_NAME: "polaris",
  PRODUCTION_MIGRATION_ROLE: "polaris_migrator",
  PRODUCTION_MIGRATION_SHA: "a".repeat(40),
  PRODUCTION_MIGRATION_TARGET_CONFIRMATION:
    "project-production-123456/br-production-123456",
  PRODUCTION_NEON_BRANCH_ID: "br-production-123456",
  PRODUCTION_NEON_PROJECT_ID: "project-production-123456",
  PRODUCTION_RUNTIME_ROLE: "polaris_app",
  ...overrides,
});

describe("validateProductionMigrationTarget", () => {
  it("returns sanitized target evidence for the confirmed direct Production target and main SHA", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(validateProductionMigrationTarget(makeMigrationTarget())).toEqual({
      branchId: "br-production-123456",
      databaseName: "polaris",
      directHostMatches: true,
      migrationRole: "polaris_migrator",
      projectId: "project-production-123456",
      releaseSha: "a".repeat(40),
    });
  });

  it("fails closed before any database connection when the direct secret is missing", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({ DATABASE_URL_DIRECT: "" })
      )
    ).toThrow(
      "DATABASE_URL_DIRECT is required; no database connection was attempted."
    );
  });

  it("rejects pooled endpoints even when the hostname is allowlisted", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          DATABASE_URL_DIRECT:
            "postgresql://polaris_migrator:synthetic-password@ep-prod-example-pooler.sa-east-1.aws.neon.tech/polaris?sslmode=verify-full",
        })
      )
    ).toThrow("direct, non-pooled Neon endpoint");
  });

  it("rejects a hostname or database name outside the approved target", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          DATABASE_URL_DIRECT:
            "postgresql://polaris_migrator:synthetic-password@ep-other-example.sa-east-1.aws.neon.tech/polaris?sslmode=verify-full",
        })
      )
    ).toThrow("does not match the approved Production host");

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          DATABASE_URL_DIRECT:
            "postgresql://polaris_migrator:synthetic-password@ep-prod-example.sa-east-1.aws.neon.tech/other?sslmode=verify-full",
        })
      )
    ).toThrow("does not match the approved Production database");
  });

  it("rejects an unexpected PostgreSQL port", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          DATABASE_URL_DIRECT:
            "postgresql://polaris_migrator:synthetic-password@ep-prod-example.sa-east-1.aws.neon.tech:6432/polaris?sslmode=verify-full",
        })
      )
    ).toThrow("DATABASE_URL_DIRECT must use PostgreSQL port 5432.");
  });

  it("rejects ambiguous duplicate sslmode parameters", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          DATABASE_URL_DIRECT:
            "postgresql://polaris_migrator:synthetic-password@ep-prod-example.sa-east-1.aws.neon.tech/polaris?sslmode=verify-full&sslmode=disable",
        })
      )
    ).toThrow("exactly one sslmode=verify-full parameter");
  });

  it("requires the operator confirmation to match the P43 project and branch IDs", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          PRODUCTION_MIGRATION_TARGET_CONFIRMATION:
            "project-production-123456/br-staging-123456",
        })
      )
    ).toThrow(
      "Target confirmation must match the recorded Production project and branch."
    );
  });

  it("requires a distinct migration role, direct TLS, main, and the SHA dispatched from main", async () => {
    const validateProductionMigrationTarget = await loadValidator();

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          PRODUCTION_MIGRATION_ROLE: "polaris_app",
          PRODUCTION_RUNTIME_ROLE: "polaris_app",
        })
      )
    ).toThrow(
      "The migration role must be distinct from the Production runtime role."
    );

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({
          DATABASE_URL_DIRECT:
            "postgresql://polaris_migrator:synthetic-password@ep-prod-example.sa-east-1.aws.neon.tech/polaris?sslmode=require",
        })
      )
    ).toThrow("sslmode=verify-full");

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({ GITHUB_REF: "refs/heads/codex/test" })
      )
    ).toThrow("must run from refs/heads/main");

    expect(() =>
      validateProductionMigrationTarget(
        makeMigrationTarget({ PRODUCTION_MIGRATION_SHA: "b".repeat(40) })
      )
    ).toThrow(
      "PRODUCTION_MIGRATION_SHA must be the full SHA dispatched from main."
    );
  });

  it("does not include connection credentials in validation errors", async () => {
    const validateProductionMigrationTarget = await loadValidator();
    const secret = "synthetic-password";

    let errorMessage = "";
    try {
      validateProductionMigrationTarget(
        makeMigrationTarget({ PRODUCTION_DATABASE_HOST: "wrong-host.example" })
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    expect(errorMessage).toContain("approved Production host");
    expect(errorMessage).not.toContain(secret);
    expect(errorMessage).not.toContain("postgresql://");
  });
});
