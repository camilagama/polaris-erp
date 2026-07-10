import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

describe("sales queries", () => {
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

  it("runs paginated sale product options inside tenant database context", async () => {
    const { getSaleProductsQuery } = await import("@/features/sales/queries");
    const { mockDb } = await resolveMocks();

    const result = await getSaleProductsQuery({
      organizationId: "org_dg_imports",
      query: "fone",
    });

    expect(mockDb.transaction).toHaveBeenCalledOnce();
    expect(result).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("keeps sale product options loaded on demand instead of in the sales page", () => {
    const salesPage = readFileSync(
      join(process.cwd(), "src/app/(app)/vendas/(list)/page.tsx"),
      "utf8"
    );
    const createSaleDialog = readFileSync(
      join(process.cwd(), "src/components/sales/create-sale-dialog.tsx"),
      "utf8"
    );

    expect(salesPage).not.toContain("getSaleProductsQuery");
    expect(salesPage).not.toContain("saleProducts");
    expect(createSaleDialog).toContain("searchSaleProductOptionsAction");
    expect(createSaleDialog).toContain("productOptionsCursor");
  });
});
