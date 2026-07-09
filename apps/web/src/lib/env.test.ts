import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const stubRequiredEnv = (
  overrides: Record<string, string | undefined> = {}
) => {
  const optionalEnvNames = [
    "ALLOW_PLAYWRIGHT_BOOTSTRAP",
    "ASAAS_API_BASE_URL",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_TOKEN",
    "BETTER_AUTH_API_KEY",
    "CLOUDFLARE_ACCESS_AUD",
    "CLOUDFLARE_ACCESS_TEAM_DOMAIN",
    "CRON_SECRET",
    "DATABASE_URL_DIRECT",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "INTERNAL_BOOTSTRAP_SECRET",
    "INTERNAL_R2_HEALTH_SECRET",
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    "NEXT_PUBLIC_SENTRY_DSN",
    "PRODUCT_IMAGE_RECONCILE_SECRET",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "RESEND_WEBHOOK_SECRET",
    "R2_ACCESS_KEY_ID",
    "R2_ACCOUNT_ID",
    "R2_BUCKET_PUBLIC",
    "R2_BUCKET_STAGING",
    "R2_PUBLIC_BASE_URL",
    "R2_SECRET_ACCESS_KEY",
    "SENTRY_AUTH_TOKEN",
    "SENTRY_DSN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "UPSTASH_REDIS_REST_TOKEN",
    "UPSTASH_REDIS_REST_URL",
    "VERCEL_ENV",
    "WOOVI_API_BASE_URL",
    "WOOVI_API_KEY",
    "WOOVI_WEBHOOK_SECRET",
  ];

  for (const envName of optionalEnvNames) {
    vi.stubEnv(envName, "");
  }

  vi.stubEnv("DATABASE_URL", "postgres://user:pass@example.com:5432/app");
  vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
  vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("NODE_ENV", "production");

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      vi.stubEnv(key, "");
      continue;
    }

    vi.stubEnv(key, value);
  }
};

describe("serverEnv", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("rejects weak Better Auth secrets in production", async () => {
    stubRequiredEnv({
      BETTER_AUTH_SECRET: "short-secret",
      NODE_ENV: "production",
    });

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("accepts strong Better Auth secrets in production", async () => {
    stubRequiredEnv({
      BETTER_AUTH_SECRET: "a".repeat(32),
      CRON_SECRET: "c".repeat(32),
      NODE_ENV: "production",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        BETTER_AUTH_SECRET: "a".repeat(32),
      }),
    });
  });

  it("rejects weak internal secrets in production", async () => {
    stubRequiredEnv({
      CRON_SECRET: "short-cron-secret",
      INTERNAL_BOOTSTRAP_SECRET: "short-bootstrap-secret",
      INTERNAL_R2_HEALTH_SECRET: "short-r2-secret",
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: "short-reconcile-secret",
    });

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("requires internal route secrets in Vercel production", async () => {
    stubRequiredEnv({
      CRON_SECRET: undefined,
      INTERNAL_R2_HEALTH_SECRET: undefined,
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: undefined,
      VERCEL_ENV: "production",
    });

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("allows local production builds without cron secret", async () => {
    stubRequiredEnv({
      CRON_SECRET: undefined,
      NODE_ENV: "production",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        CRON_SECRET: undefined,
        VERCEL_ENV: undefined,
      }),
    });
  });

  it("allows Vercel preview builds without cron secret", async () => {
    stubRequiredEnv({
      CRON_SECRET: undefined,
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        CRON_SECRET: undefined,
        VERCEL_ENV: "preview",
      }),
    });
  });
});
