const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;
const OWNER_ROLE_PATTERNS = [/neondb_owner/i, /postgres/i];

export interface ProductionPreflightEnv {
  ADMIN_APP_URL?: string;
  ALLOW_PLAYWRIGHT_BOOTSTRAP?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  DATABASE_URL?: string;
  DATABASE_URL_DIRECT?: string;
  DEPLOYMENT_SMOKE_URL?: string;
  E2E_DATABASE_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  INNGEST_EVENT_KEY?: string;
  INNGEST_SIGNING_KEY?: string;
  INTERNAL_R2_HEALTH_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
  PRODUCT_IMAGE_RECONCILE_SECRET?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_PUBLIC?: string;
  R2_BUCKET_STAGING?: string;
  R2_SECRET_ACCESS_KEY?: string;
  RLS_DATABASE_URL?: string;
  SENTRY_DSN?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  UPSTASH_REDIS_REST_URL?: string;
  VERCEL_ENV?: string;
}

export interface ProductionPreflightResult {
  errors: string[];
  ok: boolean;
}

const isEnabled = (value: string | undefined): boolean =>
  value?.toLowerCase() === "true" || value === "1";

const getConnectionUser = (connectionString: string | undefined): string => {
  if (typeof connectionString !== "string") {
    return "";
  }

  try {
    return new URL(connectionString).username;
  } catch {
    return "";
  }
};

const includesOwnerRole = (connectionString: string | undefined): boolean => {
  const username = getConnectionUser(connectionString);

  return OWNER_ROLE_PATTERNS.some((pattern) => pattern.test(username));
};

const hasStrongSecret = (value: string | undefined): boolean =>
  typeof value === "string" && value.length >= MINIMUM_PRODUCTION_SECRET_LENGTH;

const hasValue = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

const getValue = (value: string | undefined): string | undefined => {
  if (typeof value !== "string") {
    return;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getOrigin = (value: string | undefined): string | undefined => {
  const normalizedValue = getValue(value);

  if (!normalizedValue) {
    return;
  }

  try {
    return new URL(normalizedValue).origin;
  } catch {
    return;
  }
};

const REQUIRED_PRODUCTION_INTEGRATION_ENV = [
  "BETTER_AUTH_URL",
  "ADMIN_APP_URL",
  "DEPLOYMENT_SMOKE_URL",
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_STAGING",
  "R2_BUCKET_PUBLIC",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const satisfies ReadonlyArray<keyof ProductionPreflightEnv>;

const REQUIRED_VERIFY_FULL_DATABASE_URLS = [
  "DATABASE_URL",
  "DATABASE_URL_DIRECT",
  "E2E_DATABASE_URL",
  "RLS_DATABASE_URL",
] as const satisfies ReadonlyArray<keyof ProductionPreflightEnv>;

const appendProductionSecretErrors = (
  env: ProductionPreflightEnv,
  errors: string[]
): void => {
  if (!hasStrongSecret(env.BETTER_AUTH_SECRET)) {
    errors.push(
      "BETTER_AUTH_SECRET must be at least 32 characters in production preflight."
    );
  }

  if (!hasStrongSecret(env.INTERNAL_R2_HEALTH_SECRET)) {
    errors.push(
      "INTERNAL_R2_HEALTH_SECRET must be at least 32 characters in production preflight."
    );
  }

  if (!hasStrongSecret(env.PRODUCT_IMAGE_RECONCILE_SECRET)) {
    errors.push(
      "PRODUCT_IMAGE_RECONCILE_SECRET must be at least 32 characters in production preflight."
    );
  }
};

const appendRequiredUrlErrors = (
  env: ProductionPreflightEnv,
  errors: string[]
): void => {
  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  }

  if (!env.DATABASE_URL_DIRECT) {
    errors.push("DATABASE_URL_DIRECT is required for migrations.");
  }

  if (!env.RLS_DATABASE_URL) {
    errors.push("RLS_DATABASE_URL is required for promoted RLS smoke.");
  }

  if (!env.E2E_DATABASE_URL) {
    errors.push("E2E_DATABASE_URL is required for CI/preview E2E.");
  }
};

const appendIsolationErrors = (
  env: ProductionPreflightEnv,
  errors: string[]
): void => {
  if (
    env.DATABASE_URL &&
    env.DATABASE_URL_DIRECT &&
    env.DATABASE_URL === env.DATABASE_URL_DIRECT
  ) {
    errors.push("DATABASE_URL must not equal DATABASE_URL_DIRECT.");
  }

  if (
    env.DATABASE_URL &&
    env.E2E_DATABASE_URL &&
    env.DATABASE_URL === env.E2E_DATABASE_URL
  ) {
    errors.push("E2E_DATABASE_URL must not equal DATABASE_URL.");
  }

  if (
    env.RLS_DATABASE_URL &&
    env.E2E_DATABASE_URL &&
    env.RLS_DATABASE_URL === env.E2E_DATABASE_URL
  ) {
    errors.push("E2E_DATABASE_URL must not equal RLS_DATABASE_URL.");
  }

  if (includesOwnerRole(env.DATABASE_URL)) {
    errors.push("DATABASE_URL must use a runtime role, not neondb_owner.");
  }

  if (includesOwnerRole(env.E2E_DATABASE_URL)) {
    errors.push("E2E_DATABASE_URL must use a runtime role, not neondb_owner.");
  }

  if (includesOwnerRole(env.RLS_DATABASE_URL)) {
    errors.push("RLS_DATABASE_URL must not use neondb_owner.");
  }
};

const appendProductionEnvErrors = (
  env: ProductionPreflightEnv,
  errors: string[]
): void => {
  if (env.VERCEL_ENV !== "production") {
    return;
  }

  if (isEnabled(env.ALLOW_PLAYWRIGHT_BOOTSTRAP)) {
    errors.push(
      "ALLOW_PLAYWRIGHT_BOOTSTRAP must not be enabled in Vercel production."
    );
  }

  appendProductionSecretErrors(env, errors);

  for (const key of REQUIRED_PRODUCTION_INTEGRATION_ENV) {
    if (!hasValue(env[key])) {
      errors.push(`${key} is required in production preflight.`);
    }
  }

  for (const key of REQUIRED_VERIFY_FULL_DATABASE_URLS) {
    const value = getValue(env[key]);

    if (!value) {
      continue;
    }

    try {
      const url = new URL(value);

      if (url.searchParams.get("sslmode") !== "verify-full") {
        errors.push(
          `${key} must use sslmode=verify-full in production preflight.`
        );
      }
    } catch {
      errors.push(`${key} must be a valid URL in production preflight.`);
    }
  }

  const betterAuthOrigin = getOrigin(env.BETTER_AUTH_URL);
  const adminOrigin = getOrigin(env.ADMIN_APP_URL);
  const appOrigin = getOrigin(env.NEXT_PUBLIC_APP_URL);
  const deploymentSmokeOrigin = getOrigin(env.DEPLOYMENT_SMOKE_URL);

  if (betterAuthOrigin && appOrigin && betterAuthOrigin !== appOrigin) {
    errors.push(
      "BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must use the same origin."
    );
  }

  if (
    deploymentSmokeOrigin &&
    appOrigin &&
    deploymentSmokeOrigin !== appOrigin
  ) {
    errors.push(
      "DEPLOYMENT_SMOKE_URL and NEXT_PUBLIC_APP_URL must use the same origin."
    );
  }

  if (adminOrigin && appOrigin && adminOrigin === appOrigin) {
    errors.push(
      "ADMIN_APP_URL must use a separate origin from NEXT_PUBLIC_APP_URL."
    );
  }
};

export const validateProductionPreflight = (
  env: ProductionPreflightEnv
): ProductionPreflightResult => {
  const errors: string[] = [];

  appendRequiredUrlErrors(env, errors);
  appendIsolationErrors(env, errors);
  appendProductionEnvErrors(env, errors);

  return {
    ok: errors.length === 0,
    errors,
  };
};
