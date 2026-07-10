import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/products/image-storage", () => ({
  getR2StagingHealthDiagnostics: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  serverEnv: {
    INTERNAL_R2_HEALTH_SECRET: "health-secret",
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({
    ok: true,
    remaining: 10,
    resetAt: Date.now() + 1000,
  })),
  getRateLimitKeyFromRequest: vi.fn(() => "test-ip"),
}));

describe("/api/internal/health/r2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the bearer token is invalid", async () => {
    const { getR2StagingHealthDiagnostics } = await import(
      "@/features/products/image-storage"
    );
    const { GET } = await import("@/app/api/internal/health/r2/route");

    const response = await GET(
      new Request("http://localhost/api/internal/health/r2", {
        headers: {
          Authorization: "Bearer wrong",
        },
        method: "GET",
      })
    );

    expect(response.status).toBe(401);
    expect(getR2StagingHealthDiagnostics).not.toHaveBeenCalled();
  });

  it("only accepts the R2 health secret", async () => {
    const { getR2StagingHealthDiagnostics } = await import(
      "@/features/products/image-storage"
    );
    const { GET } = await import("@/app/api/internal/health/r2/route");

    const response = await GET(
      new Request("http://localhost/api/internal/health/r2", {
        headers: {
          Authorization: "Bearer unrelated-secret",
        },
        method: "GET",
      })
    );

    expect(response.status).toBe(401);
    expect(getR2StagingHealthDiagnostics).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After before checking R2 when the rate limit is exceeded", async () => {
    const { getR2StagingHealthDiagnostics } = await import(
      "@/features/products/image-storage"
    );
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const { GET } = await import("@/app/api/internal/health/r2/route");

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      ok: false,
      resetAt: Date.now() + 25_000,
      retryAfterSeconds: 25,
    });

    const response = await GET(
      new Request("http://localhost/api/internal/health/r2", {
        headers: {
          Authorization: "Bearer health-secret",
        },
        method: "GET",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas. Tente novamente em instantes.",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("25");
    expect(getR2StagingHealthDiagnostics).not.toHaveBeenCalled();
  });
});
