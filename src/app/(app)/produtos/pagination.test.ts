import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server-action-auth", () => ({
  requireActionSession: vi.fn(),
}));

vi.mock("@/app/(app)/produtos/queries", () => ({
  getProductsQuery: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const authModule = await import("@/lib/server-action-auth");
  const queriesModule = await import("@/app/(app)/produtos/queries");

  return {
    mockGetProductsQuery: queriesModule.getProductsQuery as MockFn,
    mockRequireActionSession: authModule.requireActionSession as MockFn,
  };
};

describe("loadMoreProductsAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockGetProductsQuery, mockRequireActionSession } =
      await resolveMocks();

    mockRequireActionSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockGetProductsQuery.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
  });

  it("requires authentication before loading more products", async () => {
    const { loadMoreProductsAction } = await import(
      "@/app/(app)/produtos/pagination"
    );
    const { mockGetProductsQuery, mockRequireActionSession } =
      await resolveMocks();

    mockRequireActionSession.mockRejectedValueOnce(
      new Error("Sessao invalida. Faca login novamente.")
    );

    await expect(
      loadMoreProductsAction({
        cursor: "cursor-1",
      })
    ).rejects.toThrowError("Sessao invalida. Faca login novamente.");

    expect(mockGetProductsQuery).not.toHaveBeenCalled();
  });

  it("forwards cursor and filters to the server query", async () => {
    const { loadMoreProductsAction } = await import(
      "@/app/(app)/produtos/pagination"
    );
    const { mockGetProductsQuery } = await resolveMocks();

    await loadMoreProductsAction({
      cursor: "cursor-1",
      query: "iphone",
      status: "archived",
    });

    expect(mockGetProductsQuery).toHaveBeenCalledWith({
      cursor: "cursor-1",
      query: "iphone",
      status: "archived",
    });
  });
});
