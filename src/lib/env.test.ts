import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const stubRequiredEnv = (
  overrides: Record<string, string | undefined> = {}
) => {
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
      NODE_ENV: "production",
    });

    await expect(import("@/lib/env")).rejects.toThrow();
  });

  it("requires a cron secret in Vercel production", async () => {
    stubRequiredEnv({
      CRON_SECRET: undefined,
      NODE_ENV: "production",
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
