import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-action-auth", () => ({
  requireActionSession: vi.fn(),
}));

vi.mock("@/app/(app)/vendas/queries", () => ({
  getSalesQuery: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const authModule = await import("@/lib/server-action-auth");
  const queriesModule = await import("@/app/(app)/vendas/queries");

  return {
    mockGetSalesQuery: queriesModule.getSalesQuery as MockFn,
    mockRequireActionSession: authModule.requireActionSession as MockFn,
  };
};

describe("loadMoreSalesAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockGetSalesQuery, mockRequireActionSession } =
      await resolveMocks();

    mockRequireActionSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockGetSalesQuery.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
  });

  it("requires authentication before loading more sales", async () => {
    const { loadMoreSalesAction } = await import(
      "@/app/(app)/vendas/pagination"
    );
    const { mockGetSalesQuery, mockRequireActionSession } =
      await resolveMocks();

    mockRequireActionSession.mockRejectedValueOnce(
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
    const { loadMoreSalesAction } = await import(
      "@/app/(app)/vendas/pagination"
    );
    const { mockGetSalesQuery } = await resolveMocks();

    await loadMoreSalesAction({
      cursor: "cursor-1",
      query: "maria",
      status: "cancelled",
    });

    expect(mockGetSalesQuery).toHaveBeenCalledWith({
      cursor: "cursor-1",
      query: "maria",
      status: "cancelled",
    });
  });
});
