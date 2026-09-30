export const DEFAULT_DATABASE_POOL_MAX = 3;
export const MIN_DATABASE_POOL_MAX = 1;
export const MAX_DATABASE_POOL_MAX = 20;
const LOOPBACK_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DATABASE_SSL_CONNECTION_PARAMETERS = new Set([
  "ssl",
  "sslca",
  "sslcert",
  "sslkey",
  "sslmode",
  "sslnegotiation",
  "sslpassword",
  "sslrootcert",
  "uselibpqcompat",
]);

// pg merges SSL query parameters after Pool options; strip them before enforcing the host policy.
export const stripDatabaseSslConnectionParameters = (
  connectionString: string
): string => {
  try {
    const url = new URL(connectionString);

    for (const key of [...url.searchParams.keys()]) {
      if (DATABASE_SSL_CONNECTION_PARAMETERS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return connectionString;
  }
};

export const resolveDatabaseSsl = (
  connectionString: string,
  environment = process.env.NODE_ENV
): boolean => {
  if (environment === "production") {
    return true;
  }

  try {
    const hostname = new URL(connectionString).hostname
      .replace(/^\[|\]$/g, "")
      .toLowerCase();

    return !LOOPBACK_DATABASE_HOSTS.has(hostname);
  } catch {
    return true;
  }
};

export const resolveDatabasePoolMax = (
  value: string | undefined = process.env.DATABASE_POOL_MAX
): number => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return DEFAULT_DATABASE_POOL_MAX;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < MIN_DATABASE_POOL_MAX ||
    parsedValue > MAX_DATABASE_POOL_MAX
  ) {
    throw new Error(
      `DATABASE_POOL_MAX must be an integer between ${MIN_DATABASE_POOL_MAX} and ${MAX_DATABASE_POOL_MAX}.`
    );
  }

  return parsedValue;
};
