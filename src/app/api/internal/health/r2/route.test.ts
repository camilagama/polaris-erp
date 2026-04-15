import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  serverEnv: {
    CRON_SECRET: "test-cron-secret",
  },
}));

vi.mock("@/features/products/image-storage", () => ({
  getR2StagingHealthDiagnostics: vi.fn(),
}));

describe("GET /api/internal/health/r2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when authorization is missing or invalid", async () => {
    const { GET } = await import("@/app/api/internal/health/r2/route");

    const unauthorized = await GET(
      new Request("http://localhost/api/internal/health/r2")
    );
    expect(unauthorized.status).toBe(401);

    const wrongBearer = await GET(
      new Request("http://localhost/api/internal/health/r2", {
        headers: { Authorization: "Bearer wrong" },
      })
    );
    expect(wrongBearer.status).toBe(401);
  });

  it("returns diagnostics when authorized", async () => {
    const imageStorage = await import("@/features/products/image-storage");
    const { GET } = await import("@/app/api/internal/health/r2/route");

    vi.mocked(imageStorage.getR2StagingHealthDiagnostics).mockResolvedValue({
      configured: true,
      ok: true,
      publicBucket: "public",
      r2EndpointHost: "abc.r2.cloudflarestorage.com",
      stagingBucket: "staging",
      stagingCors: {
        ok: true,
        rules: [
          {
            allowedHeaders: ["Content-Type"],
            allowedMethods: ["PUT", "HEAD"],
            allowedOrigins: ["https://tiagogama.vercel.app"],
            exposeHeaders: ["ETag"],
            maxAgeSeconds: 300,
          },
        ],
      },
      stagingHead: { ok: true },
      summary: "ok",
      timestamp: "2020-01-01T00:00:00.000Z",
    });

    const response = await GET(
      new Request("http://localhost/api/internal/health/r2", {
        headers: { Authorization: "Bearer test-cron-secret" },
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ ok: true, stagingBucket: "staging" });
  });
});
