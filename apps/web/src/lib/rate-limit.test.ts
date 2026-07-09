import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { limitMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(),
}));

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = vi.fn().mockImplementation(function RatelimitMock() {
    return {
      limit: limitMock,
    };
  });

  Ratelimit.slidingWindow = vi.fn(() => "sliding-window");

  return { Ratelimit };
});

const stubRequiredEnv = () => {
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@example.com:5432/app");
  vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
  vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example.com");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
};

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    limitMock.mockReset();
    stubRequiredEnv();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("falls back to the local limiter when Upstash is temporarily unavailable", async () => {
    limitMock.mockRejectedValueOnce(new Error("upstash unavailable"));

    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "auth-google:203.0.113.10",
        limit: 2,
        windowMs: 60_000,
      })
    ).resolves.toEqual({
      ok: true,
      remaining: 1,
      resetAt: Date.parse("2026-01-01T00:01:00.000Z"),
    });
  });
});

describe("getRateLimitKeyFromRequest", () => {
  beforeEach(() => {
    stubRequiredEnv();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("ignores invalid forwarded IP headers before building the bucket key", async () => {
    const { getRateLimitKeyFromRequest } = await import("@/lib/rate-limit");
    const request = new Request("https://app.example.com/api/auth/google", {
      headers: {
        "x-forwarded-for": "spoofed-client",
        "x-real-ip": "203.0.113.10",
      },
    });

    expect(getRateLimitKeyFromRequest(request, "auth-google")).toBe(
      "auth-google:203.0.113.10"
    );
  });
});
