import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const storageMocks = vi.hoisted(() => ({
  listAllStoredProductImageObjects: vi.fn(),
}));

const imageAccessMocks = vi.hoisted(() => ({
  listReferencedProductImageKeys: vi.fn(),
}));

vi.mock("@/features/products/image-access", () => imageAccessMocks);

vi.mock("@/features/products/image-storage", () => storageMocks);

describe("product image reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks final-image orphans for retention instead of deleting them", async () => {
    const { reconcileProductImages } = await import(
      "@/features/products/image-reconcile"
    );

    storageMocks.listAllStoredProductImageObjects.mockResolvedValue([
      {
        key: "organizations/org-1/products/product-1/v1/detail.webp",
        lastModified: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    imageAccessMocks.listReferencedProductImageKeys.mockResolvedValue(
      new Set()
    );

    await expect(reconcileProductImages()).resolves.toEqual({
      deletedCount: 0,
      orphanedCount: 1,
      retentionPendingCount: 1,
      scannedCount: 1,
      skippedRecentCount: 0,
    });
  });
});
