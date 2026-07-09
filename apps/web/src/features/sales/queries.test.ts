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
          orderBy: () => Promise.resolve([]),
        }),
      }),
    });
  });

  it("runs sale product options inside tenant database context", async () => {
    const { getSaleProductsQuery } = await import("@/features/sales/queries");
    const { mockDb } = await resolveMocks();

    await getSaleProductsQuery("org_dg_imports");

    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });
});
