import "server-only";
import { config } from "dotenv";
import { z } from "zod";

config({ path: "../../.env.local", quiet: true });
config({ path: ".env.local", quiet: true });

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}, z.string().min(1).optional());

const optionalVercelEnvironment = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}, z.enum(["development", "preview", "production"]).optional());

const optionalBooleanString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}, z.enum(["true", "false"]).optional());

const MINIMUM_AUTH_SECRET_LENGTH = 32;
const MINIMUM_INTERNAL_SECRET_LENGTH = 32;

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    DATABASE_URL_DIRECT: optionalNonEmptyString,
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_API_KEY: optionalNonEmptyString,
    ALLOW_PLAYWRIGHT_BOOTSTRAP: optionalBooleanString,
    ASAAS_API_BASE_URL: z.preprocess((value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length === 0 ? undefined : trimmedValue;
    }, z.string().url().optional()),
    ASAAS_API_KEY: optionalNonEmptyString,
    ASAAS_WEBHOOK_TOKEN: optionalNonEmptyString,
    INTERNAL_BOOTSTRAP_SECRET: optionalNonEmptyString,
    INTERNAL_R2_HEALTH_SECRET: optionalNonEmptyString,
    PRODUCT_IMAGE_RECONCILE_SECRET: optionalNonEmptyString,
    RESEND_API_KEY: optionalNonEmptyString,
    RESEND_FROM_EMAIL: optionalNonEmptyString,
    RESEND_WEBHOOK_SECRET: optionalNonEmptyString,
    SUPPORT_EMAIL: z.preprocess((value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length === 0 ? undefined : trimmedValue;
    }, z.string().email().optional()),
    GOOGLE_CLIENT_ID: optionalNonEmptyString,
    GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: optionalNonEmptyString,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    R2_ACCESS_KEY_ID: optionalNonEmptyString,
    R2_ACCOUNT_ID: optionalNonEmptyString,
    R2_BUCKET_FINAL: optionalNonEmptyString,
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
    VERCEL_ENV: optionalVercelEnvironment,
    WOOVI_API_BASE_URL: z.preprocess((value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length === 0 ? undefined : trimmedValue;
    }, z.string().url().optional()),
    WOOVI_API_KEY: optionalNonEmptyString,
    WOOVI_WEBHOOK_SECRET: optionalNonEmptyString,
  })
  .superRefine((env, context) => {
    if (
      env.NODE_ENV === "production" &&
      env.BETTER_AUTH_SECRET.length < MINIMUM_AUTH_SECRET_LENGTH
    ) {
      context.addIssue({
        code: "custom",
        message:
          "BETTER_AUTH_SECRET must be at least 32 characters in production.",
        path: ["BETTER_AUTH_SECRET"],
      });
    }

    if (env.NODE_ENV !== "production") {
      return;
    }

    for (const secretName of [
      "INTERNAL_R2_HEALTH_SECRET",
      "PRODUCT_IMAGE_RECONCILE_SECRET",
    ] as const) {
      if (env.VERCEL_ENV === "production" && !env[secretName]) {
        context.addIssue({
          code: "custom",
          message: `${secretName} is required in Vercel production.`,
          path: [secretName],
        });
      }
    }

    for (const secretName of [
      "INTERNAL_BOOTSTRAP_SECRET",
      "INTERNAL_R2_HEALTH_SECRET",
      "PRODUCT_IMAGE_RECONCILE_SECRET",
    ] as const) {
      const secretValue = env[secretName];

      if (secretValue && secretValue.length < MINIMUM_INTERNAL_SECRET_LENGTH) {
        context.addIssue({
          code: "custom",
          message: `${secretName} must be at least 32 characters in production.`,
          path: [secretName],
        });
      }
    }

    if (env.VERCEL_ENV === "production" && !env.SUPPORT_EMAIL) {
      context.addIssue({
        code: "custom",
        message: "SUPPORT_EMAIL is required in Vercel production.",
        path: ["SUPPORT_EMAIL"],
      });
    }
  });

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_API_KEY: process.env.BETTER_AUTH_API_KEY,
  ALLOW_PLAYWRIGHT_BOOTSTRAP: process.env.ALLOW_PLAYWRIGHT_BOOTSTRAP,
  ASAAS_API_BASE_URL: process.env.ASAAS_API_BASE_URL,
  ASAAS_API_KEY: process.env.ASAAS_API_KEY,
  ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
  INTERNAL_BOOTSTRAP_SECRET: process.env.INTERNAL_BOOTSTRAP_SECRET,
  INTERNAL_R2_HEALTH_SECRET: process.env.INTERNAL_R2_HEALTH_SECRET,
  PRODUCT_IMAGE_RECONCILE_SECRET: process.env.PRODUCT_IMAGE_RECONCILE_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NODE_ENV: process.env.NODE_ENV,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET_FINAL: process.env.R2_BUCKET_FINAL,
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
  VERCEL_ENV: process.env.VERCEL_ENV,
  WOOVI_API_BASE_URL: process.env.WOOVI_API_BASE_URL,
  WOOVI_API_KEY: process.env.WOOVI_API_KEY,
  WOOVI_WEBHOOK_SECRET: process.env.WOOVI_WEBHOOK_SECRET,
});
