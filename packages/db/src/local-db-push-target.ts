export interface LocalDbPushTargetEnv {
  DATABASE_URL?: string;
  DATABASE_URL_DIRECT?: string;
  DATABASE_URL_PUSH_LOCAL?: string;
}

interface PostgresTarget {
  databaseName: string;
  host: string;
  port: string;
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const SCRATCH_DATABASE_NAME = "polaris_push_scratch";
const DATABASE_PATH_PREFIX_PATTERN = /^\/+/;
const IPV6_BRACKETS_PATTERN = /^\[|\]$/g;

const parsePostgresTarget = (value: string): PostgresTarget | null => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    return null;
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(
      url.pathname.replace(DATABASE_PATH_PREFIX_PATTERN, "")
    );
  } catch {
    return null;
  }

  const hostname = url.hostname
    .replace(IPV6_BRACKETS_PATTERN, "")
    .toLowerCase();
  const host = LOOPBACK_HOSTS.has(hostname) ? "loopback" : hostname;

  if (!(host && databaseName)) {
    return null;
  }

  return {
    databaseName,
    host,
    port: url.port || "5432",
  };
};

const sameTarget = (left: PostgresTarget, right: PostgresTarget): boolean =>
  left.databaseName === right.databaseName &&
  left.host === right.host &&
  left.port === right.port;

export const validateLocalDbPushTarget = (env: LocalDbPushTargetEnv): void => {
  const value = env.DATABASE_URL_PUSH_LOCAL?.trim();

  if (!value) {
    throw new Error(
      "DATABASE_URL_PUSH_LOCAL is required for local scratch db:push."
    );
  }

  const target = parsePostgresTarget(value);

  if (!target) {
    throw new Error("DATABASE_URL_PUSH_LOCAL must be a valid PostgreSQL URL.");
  }

  if (target.host !== "loopback") {
    throw new Error(
      "DATABASE_URL_PUSH_LOCAL must use localhost, 127.0.0.1, or ::1."
    );
  }

  if (target.databaseName !== SCRATCH_DATABASE_NAME) {
    throw new Error(
      `DATABASE_URL_PUSH_LOCAL must target ${SCRATCH_DATABASE_NAME}.`
    );
  }

  for (const [envName, connectionString] of [
    ["DATABASE_URL", env.DATABASE_URL],
    ["DATABASE_URL_DIRECT", env.DATABASE_URL_DIRECT],
  ] as const) {
    const existingTarget = connectionString
      ? parsePostgresTarget(connectionString)
      : null;

    if (existingTarget && sameTarget(target, existingTarget)) {
      throw new Error(
        `DATABASE_URL_PUSH_LOCAL must be separate from ${envName}.`
      );
    }
  }
};
