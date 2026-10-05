import { describe, expect, it } from "vitest";
import { getVerificationSteps } from "../../../../scripts/verify";

describe("verification profiles", () => {
  it("keeps quick verification full-workspace and ordered", () => {
    const steps = getVerificationSteps("quick");

    expect(steps.map((step) => step.args)).toEqual([
      ["run", "docs:check"],
      ["x", "vitest", "run", "scripts/install-git-hooks.test.ts"],
      ["x", "ultracite", "check"],
      ["run", "typecheck:all"],
      ["run", "test:all"],
    ]);
    expect(JSON.stringify(steps)).not.toContain("--affected");
  });

  it("includes approved full gates without E2E runs", () => {
    const steps = getVerificationSteps("full", {
      DATABASE_URL: "postgres://ci:ci@127.0.0.1:5432/runtime",
      POSTGRES_BEHAVIOR_DATABASE_URL:
        "postgres://ci:ci@127.0.0.1:5432/polaris_behavior",
    });
    const commands = steps.map((step) => step.args.join(" "));

    expect(commands).toEqual([
      "scripts/require-postgres-behavior-database.ts",
      "run audit:baseline",
      "run audit:boundaries",
      "run env:check",
      "run docs:check",
      "x vitest run scripts/install-git-hooks.test.ts",
      "x ultracite check",
      "run typecheck:all",
      "run test:all",
      "x knip",
      "run build",
      "run build:admin",
      "run test:postgres",
    ]);
    expect(commands.join(" ")).not.toContain("e2e");
    expect(commands.join(" ")).not.toContain("--affected");
  });

  it("isolates app build origins and disables external Sentry uploads", () => {
    const steps = getVerificationSteps("full");
    const webBuild = steps.find(
      (step) => step.label === "Web production build"
    );
    const adminBuild = steps.find(
      (step) => step.label === "Admin production build"
    );

    expect(webBuild?.env?.BETTER_AUTH_URL).toBe("http://localhost:3000");
    expect(adminBuild?.env?.BETTER_AUTH_URL).toBe("http://localhost:3002");
    expect(webBuild?.env?.BETTER_AUTH_API_KEY).toBe("");
    expect(adminBuild?.env?.BETTER_AUTH_API_KEY).toBe("");
    expect(webBuild?.env?.SENTRY_AUTH_TOKEN).toBe("");
    expect(adminBuild?.env?.SENTRY_AUTH_TOKEN).toBe("");
  });

  it("uses the runtime URL only for the target guard, then tests the local database", () => {
    const postgresEnv = {
      DATABASE_URL: "postgres://ci:ci@127.0.0.1:5432/runtime",
      POSTGRES_BEHAVIOR_DATABASE_URL:
        "postgres://ci:ci@127.0.0.1:5432/polaris_behavior",
    };
    const steps = getVerificationSteps("full", postgresEnv);
    const postgresSteps = steps.filter(
      (step) =>
        step.label === "Validate disposable local PostgreSQL target" ||
        step.label === "PostgreSQL behavior tests"
    );

    expect(postgresSteps).toHaveLength(2);
    expect(postgresSteps[0]?.env).toEqual(postgresEnv);
    expect(postgresSteps[1]?.env).toEqual({
      POSTGRES_BEHAVIOR_DATABASE_URL:
        postgresEnv.POSTGRES_BEHAVIOR_DATABASE_URL,
    });
  });
});
