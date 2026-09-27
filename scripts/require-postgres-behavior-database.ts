interface PostgresBehaviorEnv {
  DATABASE_URL?: string;
  POSTGRES_BEHAVIOR_DATABASE_URL?: string;
}

interface PostgresDatabaseTarget {
  database: string;
  host: string;
  port: string;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DATABASE_PATH_PREFIX_PATTERN = /^\/+/;

const parsePostgresDatabaseTarget = (
  value: string,
  envName: string
): PostgresDatabaseTarget => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid PostgreSQL URL.`);
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${envName} must use the postgres protocol.`);
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  let database: string;
  try {
    database = decodeURIComponent(
      parsed.pathname.replace(DATABASE_PATH_PREFIX_PATTERN, "")
    );
  } catch {
    throw new Error(`${envName} must include a valid database name.`);
  }

  if (!(host && database)) {
    throw new Error(`${envName} must include a host and database name.`);
  }

  return {
    database,
    host: LOOPBACK_HOSTS.has(host) ? "loopback" : host,
    port: parsed.port || "5432",
  };
};

const formatDatabaseTarget = (target: PostgresDatabaseTarget): string => {
  const displayHost = target.host === "loopback" ? "127.0.0.1" : target.host;
  return `postgres://${displayHost}:${target.port}/${encodeURIComponent(target.database)}`;
};

const validatePostgresBehaviorDatabaseEnv = (
  env: PostgresBehaviorEnv
): string => {
  const databaseUrl = env.POSTGRES_BEHAVIOR_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "POSTGRES_BEHAVIOR_DATABASE_URL is required for PostgreSQL behavior tests. Refusing to use DATABASE_URL."
    );
  }

  const target = parsePostgresDatabaseTarget(
    databaseUrl,
    "POSTGRES_BEHAVIOR_DATABASE_URL"
  );

  if (target.host !== "loopback") {
    throw new Error(
      "POSTGRES_BEHAVIOR_DATABASE_URL must use localhost, 127.0.0.1, or ::1. Remote PostgreSQL targets are not allowed."
    );
  }

  const runtimeDatabaseUrl = env.DATABASE_URL?.trim();

  if (runtimeDatabaseUrl) {
    const runtimeTarget = parsePostgresDatabaseTarget(
      runtimeDatabaseUrl,
      "DATABASE_URL"
    );

    if (
      target.host === runtimeTarget.host &&
      target.port === runtimeTarget.port &&
      target.database === runtimeTarget.database
    ) {
      throw new Error(
        "POSTGRES_BEHAVIOR_DATABASE_URL must be separate from DATABASE_URL."
      );
    }
  }

  return formatDatabaseTarget(target);
};

if (import.meta.main) {
  try {
    const target = validatePostgresBehaviorDatabaseEnv({
      DATABASE_URL: process.env.DATABASE_URL,
      POSTGRES_BEHAVIOR_DATABASE_URL:
        process.env.POSTGRES_BEHAVIOR_DATABASE_URL,
    });
    console.log(`PostgreSQL behavior database target verified: ${target}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

export { validatePostgresBehaviorDatabaseEnv };
