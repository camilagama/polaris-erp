import "server-only";
import { z } from "zod";

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}, z.string().min(1).optional());

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_DIRECT: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_API_KEY: optionalNonEmptyString,
  ALLOW_PLAYWRIGHT_BOOTSTRAP: z.enum(["true", "false"]).optional(),
  CRON_SECRET: optionalNonEmptyString,
  INTERNAL_BOOTSTRAP_SECRET: optionalNonEmptyString,
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  R2_ACCESS_KEY_ID: optionalNonEmptyString,
  R2_ACCOUNT_ID: optionalNonEmptyString,
  R2_BUCKET_PUBLIC: optionalNonEmptyString,
  R2_BUCKET_STAGING: optionalNonEmptyString,
  R2_PUBLIC_BASE_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? undefined : trimmedValue;
  }, z.string().url().optional()),
  R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
  SENTRY_AUTH_TOKEN: optionalNonEmptyString,
  SENTRY_DSN: optionalNonEmptyString,
  SENTRY_ORG: optionalNonEmptyString,
  SENTRY_PROJECT: optionalNonEmptyString,
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? undefined : trimmedValue;
  }, z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: optionalNonEmptyString,
  UPSTASH_REDIS_REST_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? undefined : trimmedValue;
  }, z.string().url().optional()),
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_API_KEY: process.env.BETTER_AUTH_API_KEY,
  ALLOW_PLAYWRIGHT_BOOTSTRAP: process.env.ALLOW_PLAYWRIGHT_BOOTSTRAP,
  CRON_SECRET: process.env.CRON_SECRET,
  INTERNAL_BOOTSTRAP_SECRET: process.env.INTERNAL_BOOTSTRAP_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET_PUBLIC: process.env.R2_BUCKET_PUBLIC,
  R2_BUCKET_STAGING: process.env.R2_BUCKET_STAGING,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
});
