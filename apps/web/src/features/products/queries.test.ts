import { sales } from "@polaris/db/schema";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
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
const whereConditions: SQL[] = [];

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
    whereConditions.length = 0;

    const { mockDb } = await resolveMocks();

    mockDb.transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.select.mockImplementation(() => {
      const queryBuilder = {
        from: () => queryBuilder,
        innerJoin: () => queryBuilder,
        limit: () => Promise.resolve([]),
        orderBy: () => queryBuilder,
        where: (condition: SQL) => {
          whereConditions.push(condition);
          return queryBuilder;
        },
      };

      return queryBuilder;
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

  it("projects and filters sale reversals with the persisted civil date", async () => {
    const { getInventoryMovementsQuery } = await import(
      "@/features/products/queries"
    );
    const { mockDb } = await resolveMocks();

    await getInventoryMovementsQuery({
      filters: {
        from: "2026-03-01",
        to: "2026-03-31",
        type: "sale_reversal",
      },
      organizationId: "org_dg_imports",
    });

    const reversalSelection = mockDb.select.mock.calls
      .map(([selection]) => selection as Record<string, unknown>)
      .find((selection) => Object.hasOwn(selection, "saleId"));
    expect(reversalSelection?.date).toBe(sales.cancelledOn);
    expect(reversalSelection?.createdAt).toBe(sales.cancelledAt);

    const reversalFilterSql = whereConditions
      .map((condition) => new PgDialect().sqlToQuery(condition).sql)
      .find((query) => query.includes("cancelled_on"));

    expect(reversalFilterSql).toContain('"sales"."cancelled_on" >= $');
    expect(reversalFilterSql).toContain('"sales"."cancelled_on" <= $');
    expect(reversalFilterSql).toContain('"sales"."cancelled_on" is not null');
    expect(reversalFilterSql).not.toContain('date("sales"."cancelled_at")');
  });
});
