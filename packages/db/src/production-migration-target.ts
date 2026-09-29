export interface ProductionMigrationTargetEnv {
  DATABASE_URL_DIRECT?: string;
  GITHUB_REF?: string;
  GITHUB_SHA?: string;
  PRODUCTION_DATABASE_HOST?: string;
  PRODUCTION_DATABASE_NAME?: string;
  PRODUCTION_MIGRATION_ROLE?: string;
  PRODUCTION_MIGRATION_SHA?: string;
  PRODUCTION_MIGRATION_TARGET_CONFIRMATION?: string;
  PRODUCTION_NEON_BRANCH_ID?: string;
  PRODUCTION_NEON_PROJECT_ID?: string;
  PRODUCTION_RUNTIME_ROLE?: string;
}

export interface ProductionMigrationTargetEvidence {
  branchId: string;
  databaseName: string;
  directHostMatches: true;
  migrationRole: string;
  projectId: string;
  releaseSha: string;
}

const DATABASE_NAME_LEADING_SLASH_PATTERN = /^\/+/;
const FULL_GIT_SHA_PATTERN = /^[a-f0-9]{40}$/;

const readRequired = (
  env: ProductionMigrationTargetEnv,
  key: keyof ProductionMigrationTargetEnv
): string => {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(
      `${key} is required; no database connection was attempted.`
    );
  }

  return value;
};

const parseDatabaseUrl = (value: string): URL => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL_DIRECT must be a valid PostgreSQL URL.");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL_DIRECT must use the postgres protocol.");
  }

  return url;
};

const decodeUrlPart = (value: string, errorMessage: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(errorMessage);
  }
};

const parseDatabaseName = (url: URL): string => {
  const databaseName = decodeUrlPart(
    url.pathname.replace(DATABASE_NAME_LEADING_SLASH_PATTERN, ""),
    "DATABASE_URL_DIRECT must contain a valid database name."
  );

  if (!databaseName || databaseName.includes("/")) {
    throw new Error(
      "DATABASE_URL_DIRECT must contain exactly one database name."
    );
  }

  return databaseName;
};

const parseDatabaseRole = (url: URL): string => {
  const role = decodeUrlPart(
    url.username,
    "DATABASE_URL_DIRECT must contain a valid migration role."
  );

  if (!role) {
    throw new Error("DATABASE_URL_DIRECT must contain a migration role.");
  }

  return role;
};

export const validateProductionMigrationTarget = (
  env: ProductionMigrationTargetEnv
): ProductionMigrationTargetEvidence => {
  if (env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("Production migrations must run from refs/heads/main.");
  }

  const githubSha = readRequired(env, "GITHUB_SHA").toLowerCase();
  const releaseSha = readRequired(
    env,
    "PRODUCTION_MIGRATION_SHA"
  ).toLowerCase();

  if (!FULL_GIT_SHA_PATTERN.test(githubSha)) {
    throw new Error("GITHUB_SHA must be a full 40-character commit SHA.");
  }

  if (!FULL_GIT_SHA_PATTERN.test(releaseSha) || releaseSha !== githubSha) {
    throw new Error(
      "PRODUCTION_MIGRATION_SHA must be the full SHA dispatched from main."
    );
  }

  const projectId = readRequired(env, "PRODUCTION_NEON_PROJECT_ID");
  const branchId = readRequired(env, "PRODUCTION_NEON_BRANCH_ID");
  const targetConfirmation = readRequired(
    env,
    "PRODUCTION_MIGRATION_TARGET_CONFIRMATION"
  );

  // The operator checks this project/branch mapping against Neon and P43 before dispatch.
  // This guard intentionally does not receive a Neon API credential.
  if (targetConfirmation !== `${projectId}/${branchId}`) {
    throw new Error(
      "Target confirmation must match the recorded Production project and branch."
    );
  }

  const migrationRole = readRequired(env, "PRODUCTION_MIGRATION_ROLE");
  const runtimeRole = readRequired(env, "PRODUCTION_RUNTIME_ROLE");

  if (migrationRole === runtimeRole) {
    throw new Error(
      "The migration role must be distinct from the Production runtime role."
    );
  }

  const databaseUrl = parseDatabaseUrl(
    readRequired(env, "DATABASE_URL_DIRECT")
  );
  const hostname = databaseUrl.hostname.toLowerCase();

  if (hostname.includes("-pooler")) {
    throw new Error(
      "DATABASE_URL_DIRECT must use a direct, non-pooled Neon endpoint."
    );
  }

  if (databaseUrl.port && databaseUrl.port !== "5432") {
    throw new Error("DATABASE_URL_DIRECT must use PostgreSQL port 5432.");
  }

  const expectedHost = readRequired(
    env,
    "PRODUCTION_DATABASE_HOST"
  ).toLowerCase();

  if (hostname !== expectedHost) {
    throw new Error(
      "DATABASE_URL_DIRECT host does not match the approved Production host."
    );
  }

  const databaseName = parseDatabaseName(databaseUrl);
  const expectedDatabaseName = readRequired(env, "PRODUCTION_DATABASE_NAME");

  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      "DATABASE_URL_DIRECT database does not match the approved Production database."
    );
  }

  const sslModes = databaseUrl.searchParams.getAll("sslmode");

  if (sslModes.length !== 1 || sslModes[0] !== "verify-full") {
    throw new Error(
      "DATABASE_URL_DIRECT must use exactly one sslmode=verify-full parameter."
    );
  }

  const directRole = parseDatabaseRole(databaseUrl);

  if (directRole !== migrationRole) {
    throw new Error(
      "DATABASE_URL_DIRECT role does not match the approved migration role."
    );
  }

  return {
    branchId,
    databaseName,
    directHostMatches: true,
    migrationRole,
    projectId,
    releaseSha,
  };
};
