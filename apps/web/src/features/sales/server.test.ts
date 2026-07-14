import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@polaris/db", () => ({
  db: {
    execute: vi.fn(),
    query: {
      sales: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const cache = await import("next/cache");
  const dbModule = await import("@polaris/db");

  return {
    mockCacheLife: cache.cacheLife as MockFn,
    mockCacheTag: cache.cacheTag as MockFn,
    mockDb: dbModule.db as unknown as {
      execute: MockFn;
      query: {
        sales: {
          findFirst: MockFn;
        };
      };
      select: MockFn;
      transaction: MockFn;
    },
  };
};

describe("sales server caching", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.query.sales.findFirst.mockResolvedValue(null);
  });

  it("tags and caches sales date bounds with the shared analytics profile", async () => {
    const { getSalesDateBounds } = await import("@/features/sales/server");
    const { mockCacheLife, mockCacheTag, mockDb } = await resolveMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ minOccurredOn: "2026-03-15" }],
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ minStockedOn: "2026-03-01" }],
        }),
      });

    const result = await getSalesDateBounds("org_dg_imports");

    expect(mockCacheTag).toHaveBeenCalledWith(
      buildOrganizationCacheTags("org_dg_imports").analytics
    );
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(result).toEqual({
      from: "2026-03-01",
      to: expect.any(String),
    });
  });

  it("returns an existing sale before attempting a duplicate create", async () => {
    const { createSaleOnce } = await import("@/features/sales/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.sales.findFirst.mockResolvedValueOnce({
      id: "sale-existing",
    });

    await expect(
      createSaleOnce({
        actorUserId: "user-1",
        input: {
          additionalAmount: 0,
          discountAmount: 0,
          freightAmount: 0,
          idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
          items: [
            {
              expectedUnitPrice: 90,
              productId: "product-1",
              quantity: 1,
            },
          ],
          occurredOn: "2026-03-31",
          paymentFeePayer: "not_applicable",
          paymentInstallments: 0,
          paymentMethod: "pix",
        },
        loadCardInstallmentRules: vi.fn().mockResolvedValue([]),
        organizationId: "org_dg_imports",
      })
    ).resolves.toEqual({ created: false, saleId: "sale-existing" });

    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });

  it("recovers the existing sale when a concurrent idempotency insert wins", async () => {
    const { createSaleOnce } = await import("@/features/sales/server");
    const { mockDb } = await resolveMocks();

    mockDb.query.sales.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "sale-existing" });
    mockDb.transaction
      .mockImplementationOnce(async (callback) => callback(mockDb))
      .mockRejectedValueOnce(
        Object.assign(
          new Error("duplicate key value violates unique constraint"),
          {
            code: "23505",
            constraint: "sales_organization_idempotency_key_unique_idx",
          }
        )
      )
      .mockImplementationOnce(async (callback) => callback(mockDb));

    await expect(
      createSaleOnce({
        actorUserId: "user-1",
        input: {
          additionalAmount: 0,
          discountAmount: 0,
          freightAmount: 0,
          idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
          items: [
            {
              expectedUnitPrice: 90,
              productId: "product-1",
              quantity: 1,
            },
          ],
          occurredOn: "2026-03-31",
          paymentFeePayer: "not_applicable",
          paymentInstallments: 0,
          paymentMethod: "pix",
        },
        loadCardInstallmentRules: vi.fn().mockResolvedValue([]),
        organizationId: "org_dg_imports",
      })
    ).resolves.toEqual({ created: false, saleId: "sale-existing" });

    expect(mockDb.transaction).toHaveBeenCalledTimes(3);
  });
});
