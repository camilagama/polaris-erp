interface PostgresBehaviorEnv {
  DATABASE_URL?: string;
  POSTGRES_BEHAVIOR_DATABASE_URL?: string;
}

const validatePostgresBehaviorDatabaseEnv = (
  env: PostgresBehaviorEnv
): string => {
  const databaseUrl = env.POSTGRES_BEHAVIOR_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "POSTGRES_BEHAVIOR_DATABASE_URL is required for PostgreSQL behavior tests. Refusing to use DATABASE_URL."
    );
  }

  if (databaseUrl === env.DATABASE_URL?.trim()) {
    throw new Error(
      "POSTGRES_BEHAVIOR_DATABASE_URL must be separate from DATABASE_URL."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      "POSTGRES_BEHAVIOR_DATABASE_URL must be a valid PostgreSQL URL."
    );
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      "POSTGRES_BEHAVIOR_DATABASE_URL must use the postgres protocol."
    );
  }

  return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
};

if (import.meta.main) {
  try {
    const target = validatePostgresBehaviorDatabaseEnv(process.env);
    console.log(`PostgreSQL behavior database target verified: ${target}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

export { validatePostgresBehaviorDatabaseEnv };
