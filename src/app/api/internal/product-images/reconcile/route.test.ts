import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  serverEnv: {
    CRON_SECRET: "secret",
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/features/products/image-storage", () => ({
  deleteManyProductImageKeys: vi.fn(),
  getExpectedProductImageKeys: vi.fn(),
  listAllStoredProductImageObjects: vi.fn(),
  listAllStoredProductImageKeys: vi.fn(),
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

  it("returns 401 when the bearer token is invalid (GET, Vercel Cron)", async () => {
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
          Authorization: "Bearer secret",
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

  it("deletes public keys that are not referenced by products", async () => {
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );
    const dbModule = await import("@/db");
    const imageStorageModule = await import(
      "@/features/products/image-storage"
    );

    const oldDate = new Date(Date.now() - 20 * 60 * 1000);

    vi.mocked(
      imageStorageModule.listAllStoredProductImageObjects
    ).mockResolvedValue([
      {
        key: "products/product-1/v1/detail.webp",
        lastModified: oldDate,
      },
      {
        key: "products/product-2/v1/detail.webp",
        lastModified: oldDate,
      },
    ]);
    vi.mocked(imageStorageModule.getExpectedProductImageKeys).mockReturnValue([
      "products/product-1/v1/detail.webp",
    ]);
    vi.mocked(dbModule.db.select).mockReturnValue({
      from: async () => [
        {
          id: "product-1",
          imageVersion: 1,
        },
      ],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer secret",
        },
        method: "POST",
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(imageStorageModule.deleteManyProductImageKeys).toHaveBeenCalledWith([
      "products/product-2/v1/detail.webp",
    ]);
    expect(payload.deletedCount).toBe(1);
    expect(payload.orphanedKeys).toBeUndefined();
  });

  it("keeps recently uploaded orphaned keys for the next reconcile pass", async () => {
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );
    const dbModule = await import("@/db");
    const imageStorageModule = await import(
      "@/features/products/image-storage"
    );

    const recentOrphanedKey = "products/product-2/v1/detail.webp";

    vi.mocked(
      imageStorageModule.listAllStoredProductImageKeys
    ).mockResolvedValue([recentOrphanedKey]);
    vi.mocked(
      imageStorageModule.listAllStoredProductImageObjects
    ).mockResolvedValue([
      {
        key: recentOrphanedKey,
        lastModified: new Date(),
      },
    ]);
    vi.mocked(imageStorageModule.getExpectedProductImageKeys).mockReturnValue([
      "products/product-1/v1/detail.webp",
    ]);
    vi.mocked(dbModule.db.select).mockReturnValue({
      from: async () => [
        {
          id: "product-1",
          imageVersion: 1,
        },
      ],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/internal/product-images/reconcile", {
        headers: {
          Authorization: "Bearer secret",
        },
        method: "POST",
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(imageStorageModule.deleteManyProductImageKeys).toHaveBeenCalledWith(
      []
    );
    expect(payload.deletedCount).toBe(0);
    expect(payload.skippedRecentCount).toBe(1);
  });
});
