import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/products/image-urls", () => ({
  buildProductImageUrl: vi.fn(() => "/image"),
}));

vi.mock("@polaris/db", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const dbModule = await import("@polaris/db");

  return {
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      select: MockFn;
      transaction: MockFn;
    },
  };
};

describe("products queries", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    });
  });

  it("runs stock entry history inside tenant database context", async () => {
    const { getProductStockEntriesByProductIdQuery } = await import(
      "@/features/products/queries"
    );
    const { mockDb } = await resolveMocks();

    await getProductStockEntriesByProductIdQuery("org_dg_imports", "product-1");

    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });

  it("normalizes inventory movement filters from search params", async () => {
    const { normalizeInventoryMovementFilters } = await import(
      "@/features/products/queries"
    );

    expect(
      normalizeInventoryMovementFilters({
        from: "2026-03-01",
        productId: "product-1",
        to: "2026-03-31",
        type: "write_off",
      })
    ).toEqual({
      from: "2026-03-01",
      productId: "product-1",
      to: "2026-03-31",
      type: "write_off",
    });
    expect(
      normalizeInventoryMovementFilters({
        from: "03/01/2026",
        productId: "",
        to: ["2026-03-31"],
        type: "unknown",
      })
    ).toEqual({});
  });
});
