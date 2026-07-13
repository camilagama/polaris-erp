import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const stubRequiredEnv = (
  overrides: Record<string, string | undefined> = {}
) => {
  const optionalEnvNames = [
    "ALLOW_PLAYWRIGHT_BOOTSTRAP",
    "APP_LOCAL_URL",
    "APP_PUBLIC_URL",
    "APP_URL_MODE",
    "BETTER_AUTH_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "INTERNAL_BOOTSTRAP_SECRET",
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    "VERCEL_ENV",
  ];

  for (const envName of optionalEnvNames) {
    vi.stubEnv(envName, "");
  }

  vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
  vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("NODE_ENV", "production");

  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value ?? "");
  }
};

describe("auth serverEnv", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("resolves development app URLs to localhost by default", async () => {
    stubRequiredEnv({
      BETTER_AUTH_URL: "https://dev-tunnel.example.com",
      NEXT_PUBLIC_APP_URL: "https://dev-tunnel.example.com",
      NODE_ENV: "development",
    });

    await expect(import("./env")).resolves.toMatchObject({
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

    await expect(import("./env")).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        BETTER_AUTH_URL: "https://dev-tunnel.example.com",
        NEXT_PUBLIC_APP_URL: "https://dev-tunnel.example.com",
      }),
    });
  });
});
