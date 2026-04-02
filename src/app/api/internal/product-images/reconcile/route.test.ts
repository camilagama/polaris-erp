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
  listAllStoredProductImageKeys: vi.fn(),
}));

describe("POST /api/internal/product-images/reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the bearer token is invalid", async () => {
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

  it("deletes public keys that are not referenced by products", async () => {
    const { POST } = await import(
      "@/app/api/internal/product-images/reconcile/route"
    );
    const dbModule = await import("@/db");
    const imageStorageModule = await import(
      "@/features/products/image-storage"
    );

    vi.mocked(
      imageStorageModule.listAllStoredProductImageKeys
    ).mockResolvedValue([
      "products/product-1/v1/detail.webp",
      "products/product-2/v1/detail.webp",
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
  });
});
