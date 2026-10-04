import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET =
  "dgimports-e2e-bootstrap-local-only";
export const E2E_WEB_BASE_URL = "http://127.0.0.1:3001";
export const E2E_ADMIN_BASE_URL = "http://127.0.0.1:3002";
const E2E_DEFAULT_AUTH_SECRET =
  "polaris-e2e-auth-secret-not-for-production-000000000000";
const E2E_DEFAULT_ADMIN_AUTH_SECRET =
  "polaris-e2e-admin-auth-secret-not-for-production-000000000000";
const E2E_DEFAULT_GOOGLE_CLIENT_ID = "dummy-google-client-id";
const E2E_DEFAULT_GOOGLE_CLIENT_SECRET = "dummy-google-client-secret";
const E2E_DEFAULT_ADMIN_GOOGLE_CLIENT_ID = "dummy-admin-google-client-id";
const E2E_DEFAULT_ADMIN_GOOGLE_CLIENT_SECRET =
  "dummy-admin-google-client-secret";
const SAFE_INHERITED_ENVIRONMENT_KEYS = new Set([
  "APPDATA",
  "CI",
  "COMSPEC",
  "COMMONPROGRAMFILES",
  "COMMONPROGRAMFILES(X86)",
  "HOME",
  "LOCALAPPDATA",
  "PATH",
  "PATHEXT",
  "PROGRAMDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "WINDIR",
]);
const SAFE_E2E_RUNNER_ENVIRONMENT_KEYS = new Set([
  "CI",
  "E2E_NAME",
  "GITHUB_ACTIONS",
  "NODE_ENV",
  "PLAYWRIGHT_BROWSERS_PATH",
]);
const ENVIRONMENT_VARIABLE_PATTERN = /^([A-Z][A-Z0-9_]*)=/gm;
const LEADING_SLASHES_PATTERN = /^\/+/;
const NEON_POOLER_HOST_PATTERN = /^([^.]+)-pooler(?=\.)/u;
const REPOSITORY_ROOT_PATH = (() => {
  let directory = process.cwd();

  while (true) {
    if (existsSync(resolve(directory, ".env.example"))) {
      return directory;
    }

    const parent = resolve(directory, "..");

    if (parent === directory) {
      throw new Error(
        "E2E support could not find .env.example from the current directory."
      );
    }

    directory = parent;
  }
})();
const ENV_EXAMPLE_PATH = resolve(REPOSITORY_ROOT_PATH, ".env.example");
const E2E_APP_PATHS = {
  admin: "apps/admin",
  web: "apps/web",
} as const;
const NEXT_PRODUCTION_DOTENV_FILES = [
  ".env.production.local",
  ".env.production",
] as const;

const getExampleEnvironmentVariableNames = (): string[] => {
  const source = readFileSync(ENV_EXAMPLE_PATH, "utf8");

  return [...source.matchAll(ENVIRONMENT_VARIABLE_PATTERN)].flatMap((match) =>
    match[1] ? [match[1]] : []
  );
};

export const assertNoE2eProductionDotenvFiles = (filePaths: string[]): void => {
  if (filePaths.length > 0) {
    throw new Error(
      "Playwright E2E cannot run with production dotenv files; move required test values to the sanitized E2E environment."
    );
  }
};

const assertNoNextProductionDotenvFiles = (app: "admin" | "web"): void => {
  const directories = [
    REPOSITORY_ROOT_PATH,
    resolve(REPOSITORY_ROOT_PATH, E2E_APP_PATHS[app]),
  ];
  const files = directories.flatMap((directory) =>
    NEXT_PRODUCTION_DOTENV_FILES.map((fileName) => resolve(directory, fileName))
  );
  const existingFiles = files.filter((filePath) => existsSync(filePath));

  assertNoE2eProductionDotenvFiles(existingFiles);
};

interface E2eDatabaseEnv extends Record<string, string | undefined> {
  E2E_DATABASE_URL?: string;
}

const E2E_DATABASE_URL_REQUIRED_MESSAGE =
  "E2E_DATABASE_URL is required and must point to an isolated database. See docs/architecture/database-environments.md.";
const E2E_DATABASE_URL_FORMAT_MESSAGE =
  "E2E_DATABASE_URL must be a valid PostgreSQL connection URL.";
const E2E_DATABASE_URL_OWNER_ROLE_MESSAGE =
  "E2E_DATABASE_URL must use a runtime role, not neondb_owner.";

interface PostgresDatabaseTarget {
  database: string;
  host: string;
  port: string;
  username: string;
}

const parsePostgresDatabaseTarget = (
  value: string
): PostgresDatabaseTarget | undefined => {
  try {
    const url = new URL(value);
    const database = decodeURIComponent(
      url.pathname.replace(LEADING_SLASHES_PATTERN, "")
    );
    const host = url.hostname
      .toLowerCase()
      .replace(NEON_POOLER_HOST_PATTERN, "$1");
    const username = decodeURIComponent(url.username).toLowerCase();

    if (
      (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
      !host ||
      !database
    ) {
      return;
    }

    return {
      database,
      host,
      port: url.port || "5432",
      username,
    };
  } catch {
    return;
  }
};

const samePostgresTarget = (
  left: PostgresDatabaseTarget,
  right: PostgresDatabaseTarget
): boolean =>
  left.host === right.host &&
  left.port === right.port &&
  (left.host.endsWith(".neon.tech") || left.database === right.database);

export const requireE2eDatabaseUrl = (env: E2eDatabaseEnv): string => {
  const e2eDatabaseUrl = env.E2E_DATABASE_URL?.trim();

  if (!e2eDatabaseUrl) {
    throw new Error(E2E_DATABASE_URL_REQUIRED_MESSAGE);
  }

  const e2eTarget = parsePostgresDatabaseTarget(e2eDatabaseUrl);

  if (!e2eTarget) {
    throw new Error(E2E_DATABASE_URL_FORMAT_MESSAGE);
  }

  if (e2eTarget.username === "neondb_owner") {
    throw new Error(E2E_DATABASE_URL_OWNER_ROLE_MESSAGE);
  }

  for (const [alias, value] of Object.entries(env)) {
    const normalizedAlias = alias.toUpperCase();

    if (
      normalizedAlias === "E2E_DATABASE_URL" ||
      !normalizedAlias.includes("DATABASE_URL") ||
      !value?.trim()
    ) {
      continue;
    }

    const aliasTarget = parsePostgresDatabaseTarget(value.trim());

    if (aliasTarget && samePostgresTarget(e2eTarget, aliasTarget)) {
      throw new Error(
        `E2E_DATABASE_URL must target a separate PostgreSQL branch or database from ${normalizedAlias}.`
      );
    }
  }

  return e2eDatabaseUrl;
};

export const sanitizeE2eRunnerEnvironment = (
  environment: NodeJS.ProcessEnv
): void => {
  const safeEnvironment: Record<string, string> = {};

  for (const [key, value] of Object.entries(environment)) {
    const normalizedKey = key.toUpperCase();

    if (
      value !== undefined &&
      (SAFE_INHERITED_ENVIRONMENT_KEYS.has(normalizedKey) ||
        SAFE_E2E_RUNNER_ENVIRONMENT_KEYS.has(normalizedKey))
    ) {
      safeEnvironment[key] = value;
    }
  }

  for (const key of Object.keys(environment)) {
    delete environment[key];
  }

  Object.assign(environment, safeEnvironment);
};

export const createE2eServerEnv = (
  env: NodeJS.ProcessEnv,
  app: "admin" | "web"
): Record<string, string> => {
  assertNoNextProductionDotenvFiles(app);
  const e2eDatabaseUrl = requireE2eDatabaseUrl(env);
  const appUrl = app === "admin" ? E2E_ADMIN_BASE_URL : E2E_WEB_BASE_URL;
  const result: Record<string, string> = {};
  // Playwright merges this map with its parent environment, and Next loads dotenv later.
  // Mask current process keys and the tracked env contract before restoring safe values.
  const environmentKeys = new Set([
    ...Object.keys(env),
    ...getExampleEnvironmentVariableNames(),
  ]);

  for (const key of environmentKeys) {
    const value = env[key];
    result[key] =
      value !== undefined &&
      SAFE_INHERITED_ENVIRONMENT_KEYS.has(key.toUpperCase())
        ? value
        : "";
  }

  Object.assign(result, {
    ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
    APP_LOCAL_URL: appUrl,
    APP_PUBLIC_URL: "",
    APP_URL_MODE: "local",
    ADMIN_APP_URL: E2E_ADMIN_BASE_URL,
    ADMIN_BETTER_AUTH_SECRET: E2E_DEFAULT_ADMIN_AUTH_SECRET,
    ADMIN_GOOGLE_CLIENT_ID: E2E_DEFAULT_ADMIN_GOOGLE_CLIENT_ID,
    ADMIN_GOOGLE_CLIENT_SECRET: E2E_DEFAULT_ADMIN_GOOGLE_CLIENT_SECRET,
    BETTER_AUTH_API_KEY: "",
    BETTER_AUTH_SECRET: E2E_DEFAULT_AUTH_SECRET,
    BETTER_AUTH_URL: appUrl,
    DATABASE_URL: e2eDatabaseUrl,
    E2E_DATABASE_URL: e2eDatabaseUrl,
    INTERNAL_BOOTSTRAP_SECRET: E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
    GOOGLE_CLIENT_ID: E2E_DEFAULT_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: E2E_DEFAULT_GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: E2E_WEB_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: E2E_DEFAULT_GOOGLE_CLIENT_ID,
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_ENV: "production",
    VERCEL_ENV: "",
  });

  return result;
};

export const parseE2eSetCookie = (cookieHeader: string, baseUrl: string) => {
  const [nameValue, ...attributeEntries] = cookieHeader.split("; ");
  const separatorIndex = nameValue.indexOf("=");

  if (separatorIndex === -1) {
    throw new Error(`Invalid Set-Cookie header: ${cookieHeader}`);
  }

  const attributes = new Map(
    attributeEntries.map((entry) => {
      const attributeSeparatorIndex = entry.indexOf("=");

      if (attributeSeparatorIndex === -1) {
        return [entry.toLowerCase(), "true"] as const;
      }

      return [
        entry.slice(0, attributeSeparatorIndex).toLowerCase(),
        entry.slice(attributeSeparatorIndex + 1),
      ] as const;
    })
  );
  const sameSite = attributes.get("samesite")?.toLowerCase();
  let normalizedSameSite: "Lax" | "None" | "Strict" = "Lax";

  if (sameSite === "strict") {
    normalizedSameSite = "Strict";
  } else if (sameSite === "none") {
    normalizedSameSite = "None";
  }

  return {
    domain: attributes.get("domain") ?? new URL(baseUrl).hostname,
    expires: attributes.get("expires")
      ? Math.floor(Date.parse(attributes.get("expires") ?? "") / 1000)
      : undefined,
    httpOnly: attributes.has("httponly"),
    name: nameValue.slice(0, separatorIndex),
    path: attributes.get("path") ?? "/",
    sameSite: normalizedSameSite,
    secure: attributes.has("secure"),
    value: nameValue.slice(separatorIndex + 1),
  } as const;
};
