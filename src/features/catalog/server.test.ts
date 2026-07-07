import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    delete: vi.fn(),
    query: {
      categories: {
        findFirst: vi.fn(),
      },
      systemSettings: {
        findFirst: vi.fn(),
      },
    },
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const cache = await import("next/cache");
  const dbModule = await import("@/db");

  return {
    mockCacheLife: cache.cacheLife as MockFn,
    mockCacheTag: cache.cacheTag as MockFn,
    mockDb: dbModule.db as unknown as {
      delete: MockFn;
      query: {
        categories: {
          findFirst: MockFn;
        };
        systemSettings: {
          findFirst: MockFn;
        };
      };
      execute: MockFn;
      insert: MockFn;
      select: MockFn;
      transaction: MockFn;
      update: MockFn;
    },
  };
};

describe("catalog server caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs catalog settings lookup inside tenant database context", async () => {
    const { getCatalogSettings } = await import("@/features/catalog/server");
    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.query.systemSettings.findFirst.mockResolvedValue({
      idealMarkupPercent: "30.00",
      minimumMarkupPercent: "15.00",
      paymentFeeRules: [],
    });

    await getCatalogSettings("org_dg_imports");

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("tags and caches catalog settings with the catalog profile", async () => {
    const { getCatalogSettings } = await import("@/features/catalog/server");
    const { mockCacheLife, mockCacheTag, mockDb } = await resolveMocks();

    mockDb.query.systemSettings.findFirst.mockResolvedValue({
      idealMarkupPercent: "30.00",
      minimumMarkupPercent: "15.00",
      paymentFeeRules: [{ feePercent: 3, installments: 3 }],
    });
    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));

    const result = await getCatalogSettings("org_dg_imports");

    expect(mockCacheTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(mockCacheLife).toHaveBeenCalledWith("hours");
    expect(result).toMatchObject({
      idealMarkupPercent: 30,
      minimumMarkupPercent: 15,
    });
  });

  it("tags and caches category usage with the catalog profile", async () => {
    const { listCategoriesWithUsage } = await import(
      "@/features/catalog/server"
    );
    const { mockCacheLife, mockCacheTag, mockDb } = await resolveMocks();

    mockDb.select.mockReturnValue({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            groupBy: () => ({
              orderBy: async () => [
                {
                  description: "Moda",
                  id: "category-1",
                  isSystem: false,
                  key: "roupas",
                  name: "Roupas",
                  productCount: 3,
                },
              ],
            }),
          }),
        }),
      }),
    });
    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));

    const result = await listCategoriesWithUsage("org_dg_imports");

    expect(mockCacheTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").catalog
    );
    expect(mockCacheLife).toHaveBeenCalledWith("hours");
    expect(result).toEqual([
      {
        description: "Moda",
        id: "category-1",
        isSystem: false,
        key: "roupas",
        name: "Roupas",
        productCount: 3,
      },
    ]);
  });

  it("does not treat a lost category update race as success", async () => {
    const { updateCategory } = await import("@/features/catalog/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.categories.findFirst.mockResolvedValue({
      id: "category-1",
      isSystem: false,
      key: "category-1",
      name: "Antiga",
    });
    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    });

    await expect(
      updateCategory("org_dg_imports", "category-1", {
        description: "Nova descricao",
        name: "Nova",
      })
    ).rejects.toThrow("Categoria nao encontrada.");
  });

  it("does not treat a lost category delete race as success", async () => {
    const { deleteCategory } = await import("@/features/catalog/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.categories.findFirst.mockResolvedValue({
      id: "category-1",
      isSystem: false,
      key: "category-1",
      name: "Roupas",
    });
    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.select.mockReturnValue({
      from: () => ({
        where: async () => [{ total: 0 }],
      }),
    });
    mockDb.delete.mockReturnValue({
      where: () => ({
        returning: () => Promise.resolve([]),
      }),
    });

    await expect(
      deleteCategory("org_dg_imports", "category-1")
    ).rejects.toThrow("Categoria nao encontrada.");
  });
});
