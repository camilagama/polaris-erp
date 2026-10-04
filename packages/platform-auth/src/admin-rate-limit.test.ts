import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  captureMessageMock,
  checkRateLimitMock,
  headersMock,
  rateLimitConstructorMock,
  redisConstructorMock,
  slidingWindowMock,
} = vi.hoisted(() => {
  const checkRateLimitMock = vi.fn();
  const rateLimitConstructorMock = vi
    .fn()
    .mockImplementation(function RatelimitMock() {
      return { limit: checkRateLimitMock };
    });
  const redisConstructorMock = vi.fn().mockImplementation(function RedisMock() {
    return {};
  });

  return {
    captureMessageMock: vi.fn(),
    checkRateLimitMock,
    headersMock: vi.fn(),
    rateLimitConstructorMock,
    redisConstructorMock,
    slidingWindowMock: vi.fn().mockReturnValue({}),
  };
});

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(rateLimitConstructorMock, {
    slidingWindow: slidingWindowMock,
  }),
}));

vi.mock("@upstash/redis", () => ({
  Redis: redisConstructorMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: captureMessageMock,
}));

describe("admin rate limit", () => {
  afterEach(() => {
    checkRateLimitMock.mockReset();
    headersMock.mockReset();
    rateLimitConstructorMock.mockClear();
    redisConstructorMock.mockClear();
    slidingWindowMock.mockClear();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("disables optional Upstash telemetry and identifier analytics", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-real-ip": "203.0.113.10" }));
    checkRateLimitMock.mockResolvedValueOnce({
      remaining: 4,
      reset: Date.now() + 60_000,
      success: true,
    });
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");

    const { assertAdminRateLimit } = await import(
      "@polaris/platform-auth/admin-rate-limit"
    );

    await expect(
      assertAdminRateLimit({
        action: "support-note.create",
        actorAdminUserId: "user-1",
        targetId: "org-1",
      })
    ).resolves.toBeUndefined();

    expect(redisConstructorMock).toHaveBeenCalledWith({
      enableTelemetry: false,
      token: "token",
      url: "https://redis.example.com",
    });
    expect(rateLimitConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ analytics: false })
    );
  });

  it("builds an admin key from action, actor, target and request IP", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-real-ip": "203.0.113.10" }));
    checkRateLimitMock.mockResolvedValue({
      remaining: 4,
      reset: Date.now() + 60_000,
      success: true,
    });

    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    const { assertAdminRateLimit } = await import(
      "@polaris/platform-auth/admin-rate-limit"
    );

    await expect(
      assertAdminRateLimit({
        action: "organization.status.change",
        actorAdminUserId: "user-1",
        targetId: "org-1",
      })
    ).resolves.toBeUndefined();

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "admin:organization.status.change:actor:user-1:target:org-1:203.0.113.10"
    );
  });

  it("throws a retry hint when the admin bucket is exhausted", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-real-ip": "203.0.113.10" }));
    checkRateLimitMock.mockResolvedValue({
      reset: Date.now() + 60_000,
      success: false,
    });

    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    const { assertAdminRateLimit } = await import(
      "@polaris/platform-auth/admin-rate-limit"
    );

    await expect(
      assertAdminRateLimit({
        action: "support-note.create",
        actorAdminUserId: "user-1",
        targetId: "org-1",
      })
    ).rejects.toThrow("Retry after 60 seconds.");
  });

  it("fails closed when Upstash is unavailable in production", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-real-ip": "203.0.113.10" }));
    checkRateLimitMock.mockRejectedValueOnce(new Error("upstash unavailable"));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    const { assertAdminRateLimit } = await import(
      "@polaris/platform-auth/admin-rate-limit"
    );

    await expect(
      assertAdminRateLimit({
        action: "support-note.create",
        actorAdminUserId: "user-1",
        targetId: "org-1",
      })
    ).rejects.toThrow("Retry after 60 seconds.");
    expect(captureMessageMock).toHaveBeenCalledWith(
      "rate_limit.provider_unavailable",
      expect.objectContaining({
        tags: { provider: "upstash", response: "fail_closed" },
      })
    );
  });
});
