import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(),
}));

vi.mock("@/features/sales/queries", () => ({
  getSalesQuery: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const authModule = await import("@/lib/app-session");
  const queriesModule = await import("@/features/sales/queries");

  return {
    mockGetSalesQuery: queriesModule.getSalesQuery as MockFn,
    mockRequireAppContext: authModule.requireAppContext as MockFn,
  };
};

describe("loadMoreSalesAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockGetSalesQuery, mockRequireAppContext } = await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "operator",
      userId: "user-1",
    });
    mockGetSalesQuery.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
  });

  it("requires authentication before loading more sales", async () => {
    const { loadMoreSalesAction } = await import("@/features/sales/pagination");
    const { mockGetSalesQuery, mockRequireAppContext } = await resolveMocks();

    mockRequireAppContext.mockRejectedValueOnce(
      new Error("Sessao invalida. Faca login novamente.")
    );

    await expect(
      loadMoreSalesAction({
        cursor: "cursor-1",
      })
    ).rejects.toThrowError("Sessao invalida. Faca login novamente.");

    expect(mockGetSalesQuery).not.toHaveBeenCalled();
  });

  it("forwards cursor and filters to the server query", async () => {
    const { loadMoreSalesAction } = await import("@/features/sales/pagination");
    const { mockGetSalesQuery } = await resolveMocks();

    await loadMoreSalesAction({
      cursor: "cursor-1",
      query: "maria",
      status: "cancelled",
    });

    expect(mockGetSalesQuery).toHaveBeenCalledWith({
      cursor: "cursor-1",
      organizationId: "org_dg_imports",
      query: "maria",
      status: "cancelled",
    });
  });
});
