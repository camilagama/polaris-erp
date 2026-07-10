interface MigrationEnv {
  DATABASE_URL?: string;
  DATABASE_URL_DIRECT?: string;
}

const redactUrl = (value: string): string => {
  const url = new URL(value);
  return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
};

export const validateMigrationDatabaseEnv = (env: MigrationEnv): string => {
  const directUrl = env.DATABASE_URL_DIRECT?.trim();

  if (!directUrl) {
    throw new Error(
      "DATABASE_URL_DIRECT is required for database migrations. Refusing to fall back to DATABASE_URL."
    );
  }

  if (env.DATABASE_URL?.trim() === directUrl) {
    throw new Error(
      "DATABASE_URL_DIRECT must be separate from DATABASE_URL so migrations never run with the runtime connection string."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(directUrl);
  } catch {
    throw new Error("DATABASE_URL_DIRECT must be a valid PostgreSQL URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL_DIRECT must use the postgres protocol.");
  }

  return redactUrl(directUrl);
};

if (import.meta.main) {
  try {
    const safeTarget = validateMigrationDatabaseEnv(
      process.env as MigrationEnv
    );
    console.log(`Migration database target verified: ${safeTarget}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
