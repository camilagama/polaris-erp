import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { captureMessageMock, checkRateLimitMock, headersMock } = vi.hoisted(
  () => ({
    captureMessageMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    headersMock: vi.fn(),
  })
);

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }

    limit = checkRateLimitMock;
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: captureMessageMock,
}));

describe("admin rate limit", () => {
  afterEach(() => {
    checkRateLimitMock.mockReset();
    headersMock.mockReset();
    vi.resetModules();
    vi.unstubAllEnvs();
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
