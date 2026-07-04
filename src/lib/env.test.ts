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
      NODE_ENV: "production",
    });

    await expect(import("@/lib/env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        BETTER_AUTH_SECRET: "a".repeat(32),
      }),
    });
  });
});
