import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const stubRequiredEnv = (
  overrides: Record<string, string | undefined> = {}
) => {
  const optionalEnvNames = [
    "ALLOW_PLAYWRIGHT_BOOTSTRAP",
    "ASAAS_API_BASE_URL",
    "ASAAS_CARD_CHECKOUT_ENABLED",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_TOKEN",
    "BETTER_AUTH_API_KEY",
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
    "SUPPORT_EMAIL",
    "R2_ACCESS_KEY_ID",
    "R2_ACCOUNT_ID",
    "R2_BUCKET_FINAL",
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
      NODE_ENV: "production",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        BETTER_AUTH_SECRET: "a".repeat(32),
      }),
    });
  });

  it("resolves development app URLs to localhost by default", async () => {
    stubRequiredEnv({
      BETTER_AUTH_URL: "https://dev-tunnel.example.com",
      NEXT_PUBLIC_APP_URL: "https://dev-tunnel.example.com",
      NODE_ENV: "development",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        BETTER_AUTH_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    });
  });

  it("resolves development app URLs to the public tunnel when requested", async () => {
    stubRequiredEnv({
      APP_PUBLIC_URL: "https://dev-tunnel.example.com/",
      APP_URL_MODE: "tunnel",
      BETTER_AUTH_URL: "https://stale.example.com",
      NEXT_PUBLIC_APP_URL: "https://stale.example.com",
      NODE_ENV: "development",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        BETTER_AUTH_URL: "https://dev-tunnel.example.com",
        NEXT_PUBLIC_APP_URL: "https://dev-tunnel.example.com",
      }),
    });
  });

  it("rejects weak internal secrets in production", async () => {
    stubRequiredEnv({
      INTERNAL_BOOTSTRAP_SECRET: "short-bootstrap-secret",
      INTERNAL_R2_HEALTH_SECRET: "short-r2-secret",
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: "short-reconcile-secret",
    });

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("requires internal route secrets in Vercel production", async () => {
    stubRequiredEnv({
      INTERNAL_R2_HEALTH_SECRET: undefined,
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: undefined,
      SUPPORT_EMAIL: "support@example.com",
      VERCEL_ENV: "production",
    });

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("requires support email in Vercel production", async () => {
    stubRequiredEnv({
      INTERNAL_R2_HEALTH_SECRET: "a".repeat(32),
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: "b".repeat(32),
      SUPPORT_EMAIL: undefined,
      VERCEL_ENV: "production",
    });

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("accepts support email when configured", async () => {
    stubRequiredEnv({
      SUPPORT_EMAIL: "support@example.com",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        SUPPORT_EMAIL: "support@example.com",
      }),
    });
  });

  it("accepts the final R2 bucket name", async () => {
    stubRequiredEnv({
      R2_BUCKET_FINAL: "product-images-final",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        R2_BUCKET_FINAL: "product-images-final",
      }),
    });
  });

  it("allows local production builds without internal route secrets", async () => {
    stubRequiredEnv({
      INTERNAL_R2_HEALTH_SECRET: undefined,
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: undefined,
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        INTERNAL_R2_HEALTH_SECRET: undefined,
        PRODUCT_IMAGE_RECONCILE_SECRET: undefined,
        VERCEL_ENV: undefined,
      }),
    });
  });

  it("allows Vercel preview builds without internal route secrets", async () => {
    stubRequiredEnv({
      INTERNAL_R2_HEALTH_SECRET: undefined,
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: undefined,
      VERCEL_ENV: "preview",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        INTERNAL_R2_HEALTH_SECRET: undefined,
        PRODUCT_IMAGE_RECONCILE_SECRET: undefined,
        VERCEL_ENV: "preview",
      }),
    });
  });

  it.each([
    {
      baseUrl: "https://api.asaas.com./v3",
      baseUrlName: "ASAAS_API_BASE_URL",
      nodeEnv: "development",
      vercelEnv: undefined,
      target: "local development",
    },
    {
      baseUrl: "https://api.woovi.com",
      baseUrlName: "WOOVI_API_BASE_URL",
      nodeEnv: "production",
      vercelEnv: undefined,
      target: "a CI production build",
    },
    {
      baseUrl: "https://api.asaas.com/v3",
      baseUrlName: "ASAAS_API_BASE_URL",
      nodeEnv: "production",
      vercelEnv: "preview",
      target: "a Vercel Preview",
    },
  ])(
    "rejects a Production provider endpoint in $target",
    async ({ baseUrl, baseUrlName, nodeEnv, vercelEnv }) => {
      stubRequiredEnv({
        [baseUrlName]: baseUrl,
        NODE_ENV: nodeEnv,
        VERCEL_ENV: vercelEnv,
      });

      await expect(import("@/lib/env")).rejects.toThrow(
        `${baseUrlName} must not use a Production provider endpoint outside Vercel Production.`
      );
    }
  );

  it("accepts Sandbox provider endpoints in non-production environments", async () => {
    stubRequiredEnv({
      ASAAS_API_BASE_URL: "https://api-sandbox.asaas.com/v3",
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      WOOVI_API_BASE_URL: "https://api.woovi-sandbox.com",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        ASAAS_API_BASE_URL: "https://api-sandbox.asaas.com/v3",
        WOOVI_API_BASE_URL: "https://api.woovi-sandbox.com",
      }),
    });
  });

  it("allows Production provider endpoints in Vercel Production", async () => {
    stubRequiredEnv({
      ASAAS_API_BASE_URL: "https://api.asaas.com/v3",
      INTERNAL_R2_HEALTH_SECRET: "a".repeat(32),
      NODE_ENV: "production",
      PRODUCT_IMAGE_RECONCILE_SECRET: "b".repeat(32),
      SUPPORT_EMAIL: "support@example.com",
      VERCEL_ENV: "production",
      WOOVI_API_BASE_URL: "https://api.woovi.com",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        ASAAS_API_BASE_URL: "https://api.asaas.com/v3",
        WOOVI_API_BASE_URL: "https://api.woovi.com",
      }),
    });
  });
});
