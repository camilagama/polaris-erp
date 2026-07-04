import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      systemSettings: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
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
      query: {
        systemSettings: {
          findFirst: MockFn;
        };
      };
      select: MockFn;
    },
  };
};

describe("catalog server caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tags and caches catalog settings with the catalog profile", async () => {
    const { getCatalogSettings } = await import("@/features/catalog/server");
    const { mockCacheLife, mockCacheTag, mockDb } = await resolveMocks();

    mockDb.query.systemSettings.findFirst.mockResolvedValue({
      idealMarkupPercent: "30.00",
      minimumMarkupPercent: "15.00",
      paymentFeeRules: [{ feePercent: 3, installments: 3 }],
    });

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
});
