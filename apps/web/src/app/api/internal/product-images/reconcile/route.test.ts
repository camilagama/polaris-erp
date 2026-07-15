import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  serverEnv: {
    PRODUCT_IMAGE_RECONCILE_SECRET: "reconcile-secret",
  },
}));

vi.mock("@/features/products/image-reconcile", () => ({
  reconcileProductImages: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({
    ok: true,
    remaining: 10,
    resetAt: Date.now() + 1000,
  })),
  getRateLimitKeyFromRequest: vi.fn(() => "test-ip"),
}));

describe("/api/internal/product-images/reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the bearer token is invalid (POST)", async () => {
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );

    const response = await POST(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer wrong",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when the bearer token is invalid (GET)", async () => {
    const { GET } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );

    const response = await GET(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer wrong",
        },
        method: "GET",
      })
    );

    expect(response.status).toBe(401);
  });

  it("only accepts the reconcile secret", async () => {
    const { reconcileProductImages } = await import(
      "@/features/products/image-reconcile"
    );
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );

    const response = await POST(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer unrelated-secret",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    expect(reconcileProductImages).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the reconcile rate limit is exceeded", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      ok: false,
      resetAt: Date.now() + 30_000,
      retryAfterSeconds: 30,
    });

    const response = await POST(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer reconcile-secret",
        },
        method: "POST",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas. Tente novamente em instantes.",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
  });

  it("reports unreferenced final keys as pending retention without deleting them", async () => {
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );
    const { reconcileProductImages } = await import(
      "@/features/products/image-reconcile"
    );

    vi.mocked(reconcileProductImages).mockResolvedValue({
      deletedCount: 0,
      orphanedCount: 1,
      retentionPendingCount: 1,
      scannedCount: 2,
      skippedRecentCount: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer reconcile-secret",
        },
        method: "POST",
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(reconcileProductImages).toHaveBeenCalledOnce();
    expect(payload).toEqual({
      deletedCount: 0,
      orphanedCount: 1,
      retentionPendingCount: 1,
      scannedCount: 2,
      skippedRecentCount: 0,
    });
  });

  it("returns an empty retention backlog when no final-image orphan exists", async () => {
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );
    const { reconcileProductImages } = await import(
      "@/features/products/image-reconcile"
    );

    vi.mocked(reconcileProductImages).mockResolvedValue({
      deletedCount: 0,
      orphanedCount: 0,
      retentionPendingCount: 0,
      scannedCount: 1,
      skippedRecentCount: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer reconcile-secret",
        },
        method: "POST",
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(reconcileProductImages).toHaveBeenCalledOnce();
    expect(payload).toEqual({
      deletedCount: 0,
      orphanedCount: 0,
      retentionPendingCount: 0,
      scannedCount: 1,
      skippedRecentCount: 0,
    });
  });

  it("keeps product image reference queries outside the route handler", () => {
    const source = readFileSync(join(import.meta.dirname, "route.ts"), "utf8");

    expect(source).not.toContain('from "@polaris/db"');
    expect(source).not.toContain('from "@polaris/db/schema"');
  });
});
