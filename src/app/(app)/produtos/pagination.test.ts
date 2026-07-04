import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(),
}));

vi.mock("@/app/(app)/produtos/queries", () => ({
  getProductsQuery: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const authModule = await import("@/lib/app-session");
  const queriesModule = await import("@/app/(app)/produtos/queries");

  return {
    mockGetProductsQuery: queriesModule.getProductsQuery as MockFn,
    mockRequireAppContext: authModule.requireAppContext as MockFn,
  };
};

describe("loadMoreProductsAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockGetProductsQuery, mockRequireAppContext } =
      await resolveMocks();

    mockRequireAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "viewer",
      userId: "user-1",
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
    const { mockGetProductsQuery, mockRequireAppContext } =
      await resolveMocks();

    mockRequireAppContext.mockRejectedValueOnce(
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
      organizationId: "org_dg_imports",
      query: "iphone",
      status: "archived",
    });
  });
});
