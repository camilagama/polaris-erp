import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    cache: <T extends (...args: any[]) => any>(fn: T) => {
      const memo = new Map<string, ReturnType<T>>();

      return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);

        if (!memo.has(key)) {
          memo.set(key, fn(...args));
        }

        return memo.get(key) as ReturnType<T>;
      }) as T;
    },
  };
});

vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/features/dashboard/metrics", () => ({
  buildDashboardContributionGraph: vi.fn(),
  buildDashboardMetrics: vi.fn(({ range }) => ({
    inventoryByCategory: [],
    periodComparison: [],
    periodGranularity: "day",
    resultStatus: "breakEven",
    selectedRange: range,
    topProducts: [],
    totalCosts: 0,
    totalProductCosts: 0,
    totalResult: 0,
    totalSalesCount: 0,
    totalShippingAndSellerFees: 0,
    totalSold: 0,
  })),
  resolveContributionGraphRange: vi.fn(() => ({
    from: "2026-03-01",
    to: "2026-03-31",
  })),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const cache = await import("next/cache");
  const dbModule = await import("@/db");

  return {
    mockCacheLife: cache.cacheLife as MockFn,
    mockCacheTag: cache.cacheTag as MockFn,
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      select: MockFn;
      transaction: MockFn;
    },
  };
};

describe("dashboard server caching", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
  });

  it("runs dashboard metrics inside tenant database context", async () => {
    const { getDashboardMetrics } = await import("@/features/dashboard/server");
    const { mockDb } = await resolveMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: async () => [],
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              groupBy: () => ({
                orderBy: async () => [],
              }),
            }),
          }),
        }),
      });

    await getDashboardMetrics("org_dg_imports", {
      from: "2026-04-01",
      to: "2026-04-30",
    });

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("tags and caches dashboard date bounds with the shared analytics profile", async () => {
    const { getDashboardDateBounds } = await import(
      "@/features/dashboard/server"
    );
    const { mockCacheLife, mockCacheTag, mockDb } = await resolveMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ minOccurredOn: "2026-03-10" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ minStockedOn: "2026-03-01" }],
        }),
      });

    const result = await getDashboardDateBounds("org_dg_imports");

    expect(mockCacheTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(result).toEqual({
      from: "2026-03-01",
      to: expect.any(String),
    });
  });

  it("tags and caches dashboard global stats with the shared analytics profile", async () => {
    const { getDashboardGlobalStats } = await import(
      "@/features/dashboard/server"
    );
    const { mockCacheLife, mockCacheTag, mockDb } = await resolveMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ total: "1000.00" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [
            {
              totalAmount: "900.00",
              totalFee: "30.00",
              totalFreight: "20.00",
            },
          ],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: async () => [{ totalCost: "400.00" }],
          }),
        }),
      });

    const result = await getDashboardGlobalStats("org_dg_imports");

    expect(mockCacheTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(result).toEqual({
      investment: 1000,
      profit: 450,
    });
  });

  it("memoizes dashboard metrics by range within the same request scope", async () => {
    const { getDashboardMetrics } = await import("@/features/dashboard/server");
    const { mockDb } = await resolveMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: async () => [],
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              groupBy: () => ({
                orderBy: async () => [],
              }),
            }),
          }),
        }),
      });

    const first = await getDashboardMetrics("org_dg_imports", {
      from: "2026-03-01",
      to: "2026-03-31",
    });
    const second = await getDashboardMetrics("org_dg_imports", {
      from: "2026-03-01",
      to: "2026-03-31",
    });

    expect(mockDb.select).toHaveBeenCalledTimes(3);
    expect(second).toBe(first);
  });
});
