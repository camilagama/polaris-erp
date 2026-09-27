import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

export type VerificationProfile = "quick" | "full";

export interface VerificationStep {
  args: string[];
  env?: Record<string, string | undefined>;
  label: string;
}

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const SAFE_VERIFY_ENV: Record<string, string> = {
  ADMIN_E2E_DATABASE_URL: "",
  DATABASE_URL: "",
  DATABASE_URL_DIRECT: "",
  E2E_DATABASE_URL: "",
  POSTGRES_BEHAVIOR_DATABASE_URL: "",
  RLS_DATABASE_URL: "",
  TURBO_TEAM: "",
  TURBO_TOKEN: "",
};

const QUICK_STEPS: VerificationStep[] = [
  { args: ["run", "docs:check"], label: "Markdown links" },
  { args: ["x", "ultracite", "check"], label: "Workspace lint and format" },
  { args: ["run", "typecheck:all"], label: "Workspace typecheck" },
  { args: ["run", "test:all"], label: "Workspace unit tests" },
];

const WEB_BUILD_ENV: Record<string, string> = {
  BETTER_AUTH_API_KEY: "",
  BETTER_AUTH_SECRET: "ci-better-auth-secret-at-least-32-chars!!",
  BETTER_AUTH_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://ci:ci@127.0.0.1:5432/ci",
  GOOGLE_CLIENT_ID: "dummy-google-client-id",
  GOOGLE_CLIENT_SECRET: "dummy-google-client-secret",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "dummy-google-client-id",
  NEXT_PUBLIC_SENTRY_DSN: "",
  SENTRY_AUTH_TOKEN: "",
  SENTRY_DSN: "",
  SENTRY_ORG: "",
  SENTRY_PROJECT: "",
};

const ADMIN_BUILD_ENV: Record<string, string> = {
  ...WEB_BUILD_ENV,
  ADMIN_BETTER_AUTH_SECRET: "ci-admin-better-auth-secret-at-least-32-chars!!",
  ADMIN_GOOGLE_CLIENT_ID: "dummy-admin-google-client-id",
  ADMIN_GOOGLE_CLIENT_SECRET: "dummy-admin-google-client-secret",
  BETTER_AUTH_URL: "http://localhost:3002",
};

const getQuickSteps = (): VerificationStep[] => [...QUICK_STEPS];

export const getVerificationSteps = (
  profile: VerificationProfile,
  postgresEnv: Record<string, string | undefined> = {}
): VerificationStep[] => {
  if (profile === "quick") {
    return getQuickSteps();
  }

  return [
    {
      args: ["scripts/require-postgres-behavior-database.ts"],
      env: postgresEnv,
      label: "Validate disposable local PostgreSQL target",
    },
    { args: ["run", "audit:baseline"], label: "Dependency advisory baseline" },
    { args: ["run", "audit:boundaries"], label: "Core dependency boundaries" },
    { args: ["run", "env:check"], label: "Production environment contract" },
    ...getQuickSteps(),
    { args: ["x", "knip"], label: "Unused code and exports" },
    {
      args: ["run", "build"],
      env: WEB_BUILD_ENV,
      label: "Web production build",
    },
    {
      args: ["run", "build:admin"],
      env: ADMIN_BUILD_ENV,
      label: "Admin production build",
    },
    {
      args: ["run", "test:postgres"],
      env: {
        POSTGRES_BEHAVIOR_DATABASE_URL:
          postgresEnv.POSTGRES_BEHAVIOR_DATABASE_URL,
      },
      label: "PostgreSQL behavior tests",
    },
  ];
};

const getPostgresEnv = (): Record<string, string> => {
  const envPath = resolve(REPOSITORY_ROOT, ".env.local");
  const localEnv = existsSync(envPath)
    ? parse(readFileSync(envPath, "utf8"))
    : {};
  const env: Record<string, string> = {};
  const databaseUrl = process.env.DATABASE_URL ?? localEnv.DATABASE_URL;
  const postgresBehaviorDatabaseUrl =
    process.env.POSTGRES_BEHAVIOR_DATABASE_URL ??
    localEnv.POSTGRES_BEHAVIOR_DATABASE_URL;

  if (databaseUrl !== undefined) {
    env.DATABASE_URL = databaseUrl;
  }
  if (postgresBehaviorDatabaseUrl !== undefined) {
    env.POSTGRES_BEHAVIOR_DATABASE_URL = postgresBehaviorDatabaseUrl;
  }

  return env;
};

const runStep = (step: VerificationStep): number => {
  console.log(`\n==> ${step.label}`);
  console.log(`bun ${step.args.join(" ")}`);

  const result = spawnSync("bun", step.args, {
    cwd: REPOSITORY_ROOT,
    env: {
      ...process.env,
      ...SAFE_VERIFY_ENV,
      ...step.env,
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Could not start Bun: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
};

const main = (): void => {
  const profile = process.argv[2];

  if (profile !== "quick" && profile !== "full") {
    console.error("Usage: bun scripts/verify.ts <quick|full>");
    process.exitCode = 2;
    return;
  }

  const postgresEnv = profile === "full" ? getPostgresEnv() : {};
  const steps = getVerificationSteps(profile, postgresEnv);

  for (const step of steps) {
    const exitCode = runStep(step);

    if (exitCode !== 0) {
      console.error(`\nVerification stopped at: ${step.label}`);
      process.exitCode = exitCode;
      return;
    }
  }

  console.log(`\nVerification profile passed: ${profile}`);
};

if (import.meta.main) {
  main();
}
