import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { captureMessageMock, limitMock } = vi.hoisted(() => ({
  captureMessageMock: vi.fn(),
  limitMock: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: captureMessageMock,
}));

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = vi.fn().mockImplementation(function RatelimitMock() {
    return {
      limit: limitMock,
    };
  }) as ReturnType<typeof vi.fn> & {
    slidingWindow: ReturnType<typeof vi.fn>;
  };

  Ratelimit.slidingWindow = vi.fn(() => "sliding-window");

  return { Ratelimit };
});

const stubRequiredEnv = () => {
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@example.com:5432/app");
  vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
  vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SENTRY_DSN", "https://public@example.com/1");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example.com");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
};

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("disables optional Upstash telemetry and identifier analytics", async () => {
    const resetAt = Date.parse("2026-01-01T00:01:00.000Z");
    limitMock.mockResolvedValueOnce({
      remaining: 4,
      reset: resetAt,
      success: true,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "auth-google:203.0.113.10",
        limit: 5,
        windowMs: 60_000,
      })
    ).resolves.toEqual({ ok: true, remaining: 4, resetAt });

    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    expect(Redis).toHaveBeenCalledWith({
      enableTelemetry: false,
      token: "upstash-token",
      url: "https://upstash.example.com",
    });
    expect(Ratelimit).toHaveBeenCalledWith(
      expect.objectContaining({ analytics: false })
    );
  });

  it("fails closed when Upstash is temporarily unavailable in production", async () => {
    limitMock.mockRejectedValueOnce(new Error("upstash unavailable"));

    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "auth-google:203.0.113.10",
        limit: 2,
        windowMs: 60_000,
      })
    ).resolves.toEqual({
      ok: false,
      resetAt: Date.parse("2026-01-01T00:01:00.000Z"),
      retryAfterSeconds: 60,
    });
    expect(captureMessageMock).toHaveBeenCalledWith(
      "rate_limit.provider_unavailable",
      expect.objectContaining({
        tags: { provider: "upstash", response: "fail_closed" },
      })
    );
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
    const { getRateLimitKeyFromHeaders, getRateLimitKeyFromRequest } =
      await import("@/lib/rate-limit");
    const request = new Request("https://app.example.com/api/auth/google", {
      headers: {
        "x-forwarded-for": "spoofed-client",
        "x-real-ip": "203.0.113.10",
      },
    });

    expect(getRateLimitKeyFromRequest(request, "auth-google")).toBe(
      "auth-google:203.0.113.10"
    );
    expect(getRateLimitKeyFromHeaders(request.headers, "auth-google")).toBe(
      "auth-google:203.0.113.10"
    );
  });
});
