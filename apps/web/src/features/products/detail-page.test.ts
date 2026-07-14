import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadProductDetailPage } from "@/features/products/detail-page";

const loaderMocks = vi.hoisted(() => ({
  buildProductInventorySummary: vi.fn((input: unknown) => ({
    historyItems: [],
    input,
    totalCost: 30,
    totalWriteOffLoss: 0,
    totalWriteOffs: 0,
  })),
  getCatalogSettings: vi.fn(),
  getProductByIdQuery: vi.fn(),
  getProductPriceChangesByProductIdQuery: vi.fn(),
  getProductSalesByProductIdQuery: vi.fn(),
  getProductSalesHistoryMetrics: vi.fn(),
  getProductStockEntriesByProductIdQuery: vi.fn(),
  getProductStockWriteOffsByProductIdQuery: vi.fn(),
  listCategoriesWithUsage: vi.fn(),
  requirePageAppContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/app-session", () => ({
  requirePageAppContext: loaderMocks.requirePageAppContext,
}));

vi.mock("@/features/catalog/server", () => ({
  getCatalogSettings: loaderMocks.getCatalogSettings,
  listCategoriesWithUsage: loaderMocks.listCategoriesWithUsage,
}));

vi.mock("@/features/products/history", () => ({
  buildProductInventorySummary: loaderMocks.buildProductInventorySummary,
}));

vi.mock("@/features/products/queries", () => ({
  getProductByIdQuery: loaderMocks.getProductByIdQuery,
  getProductPriceChangesByProductIdQuery:
    loaderMocks.getProductPriceChangesByProductIdQuery,
  getProductSalesByProductIdQuery: loaderMocks.getProductSalesByProductIdQuery,
  getProductStockEntriesByProductIdQuery:
    loaderMocks.getProductStockEntriesByProductIdQuery,
  getProductStockWriteOffsByProductIdQuery:
    loaderMocks.getProductStockWriteOffsByProductIdQuery,
}));

vi.mock("@/features/products/server", () => ({
  getProductSalesHistoryMetrics: loaderMocks.getProductSalesHistoryMetrics,
}));

const product = {
  archivedAt: null,
  categoryId: "category-1",
  categoryName: "Roupas",
  costPrice: "10.00",
  createdAt: new Date("2026-03-31T10:00:00.000Z"),
  description: null,
  id: "product-1",
  image: null,
  name: "Produto",
  price: "20.00",
  purchasedOn: "2026-03-31",
  stock: 3,
};

describe("loadProductDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loaderMocks.requirePageAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
    });
    loaderMocks.getCatalogSettings.mockResolvedValue({
      minimumMarkupPercent: 0,
    });
    loaderMocks.listCategoriesWithUsage.mockResolvedValue([
      { id: "category-1", name: "Roupas" },
    ]);
    loaderMocks.getProductStockEntriesByProductIdQuery.mockResolvedValue([
      {
        createdAt: new Date("2026-03-31T10:00:30.000Z"),
        id: "entry-1",
        productId: "product-1",
        quantity: 3,
        stockedOn: "2026-03-31",
        unitCost: "10.00",
      },
    ]);
    loaderMocks.getProductStockWriteOffsByProductIdQuery.mockResolvedValue([]);
    loaderMocks.getProductSalesByProductIdQuery.mockResolvedValue([]);
    loaderMocks.getProductSalesHistoryMetrics.mockResolvedValue({
      totalQuantitySold: 0,
      totalSoldAmount: 0,
      trend: [],
    });
    loaderMocks.getProductPriceChangesByProductIdQuery.mockResolvedValue([]);
  });

  it("returns null when the product is missing after resolving page context", async () => {
    loaderMocks.getProductByIdQuery.mockResolvedValue(null);

    await expect(loadProductDetailPage("missing-product")).resolves.toBeNull();

    expect(loaderMocks.getProductByIdQuery).toHaveBeenCalledWith(
      "org_dg_imports",
      "missing-product"
    );
    expect(
      loaderMocks.getProductStockEntriesByProductIdQuery
    ).not.toHaveBeenCalled();
  });

  it("loads detail data and assembles the inventory summary DTO", async () => {
    loaderMocks.getProductByIdQuery.mockResolvedValue(product);

    const result = await loadProductDetailPage("product-1");

    expect(result).toMatchObject({
      averageCost: 10,
      categoriesForActions: [{ id: "category-1", name: "Roupas" }],
      product,
    });
    expect(loaderMocks.buildProductInventorySummary).toHaveBeenCalledWith(
      expect.objectContaining({
        averageCost: 10,
        currentStock: 3,
        entries: [
          expect.objectContaining({
            id: "entry-1",
            isInitial: true,
            unitCost: 10,
          }),
        ],
      })
    );
  });
});
