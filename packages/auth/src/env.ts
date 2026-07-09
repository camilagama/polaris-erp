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

const authEnvSchema = z
  .object({
    ALLOW_PLAYWRIGHT_BOOTSTRAP: optionalBooleanString,
    BETTER_AUTH_API_KEY: optionalNonEmptyString,
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: optionalNonEmptyString,
    GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
    INTERNAL_BOOTSTRAP_SECRET: optionalNonEmptyString,
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: optionalNonEmptyString,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    VERCEL_ENV: optionalVercelEnvironment,
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

    const secretValue = env.INTERNAL_BOOTSTRAP_SECRET;

    if (secretValue && secretValue.length < MINIMUM_INTERNAL_SECRET_LENGTH) {
      context.addIssue({
        code: "custom",
        message:
          "INTERNAL_BOOTSTRAP_SECRET must be at least 32 characters in production.",
        path: ["INTERNAL_BOOTSTRAP_SECRET"],
      });
    }
  });

export const serverEnv = authEnvSchema.parse({
  ALLOW_PLAYWRIGHT_BOOTSTRAP: process.env.ALLOW_PLAYWRIGHT_BOOTSTRAP,
  BETTER_AUTH_API_KEY: process.env.BETTER_AUTH_API_KEY,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  INTERNAL_BOOTSTRAP_SECRET: process.env.INTERNAL_BOOTSTRAP_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
});
