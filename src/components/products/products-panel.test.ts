// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductsPanel } from "@/components/products/products-panel";
import type {
  ProductAnalytics,
  ProductListItem,
} from "@/features/products/contracts";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const productMocks = vi.hoisted(() => ({
  loadMoreProductsAction: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/features/products/actions", () => ({
  archiveProductAction: vi.fn(),
  removeProductImageAction: vi.fn(),
  replaceProductImageAction: vi.fn(),
  unarchiveProductAction: vi.fn(),
  updateProductAction: vi.fn(),
}));

vi.mock("@/features/products/pagination", () => ({
  loadMoreProductsAction: productMocks.loadMoreProductsAction,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    error: productMocks.toastError,
    success: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/produtos",
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@/components/products/product-sales-chart", () => ({
  ProductCatalogPerformanceChart: () => null,
}));

vi.mock("@/components/dashboard/inventory-categories-chart", () => ({
  InventoryCategoriesChart: () => null,
}));

const analytics: ProductAnalytics = {
  inventoryByCategory: [],
  recentPerformance: [],
  totalActiveProductsInStock: 1,
  totalInventoryInvestment: 10,
  totalUnitsInStock: 1,
};

const product: ProductListItem = {
  archivedAt: null,
  categoryId: "category-1",
  categoryName: "Categoria",
  costPrice: "10.00",
  createdAt: new Date("2026-03-31T00:00:00.000Z"),
  description: null,
  id: "product-1",
  image: null,
  name: "Produto teste",
  price: "20.00",
  purchasedOn: "2026-03-31",
  stock: 1,
};

describe("ProductsPanel", () => {
  afterEach(() => {
    productMocks.loadMoreProductsAction.mockReset();
    productMocks.toastError.mockReset();
    document.body.innerHTML = "";
  });

  it("shows feedback and releases the load-more button when pagination fails", async () => {
    productMocks.loadMoreProductsAction.mockRejectedValueOnce(
      new Error("Falha ao carregar pagina")
    );

    const container = document.createElement("div");
    document.body.append(container);

    let root: Root | null = null;
    act(() => {
      root = createRoot(container);
      root.render(
        createElement(ProductsPanel, {
          analytics,
          appliedQuery: "",
          categories: [
            { id: "category-1", key: "categoria", name: "Categoria" },
          ],
          initialCursor: "cursor-1",
          products: [product],
          role: "operator",
          settings: {
            idealMarkupPercent: 100,
            minimumMarkupPercent: 30,
          },
          status: "active",
        })
      );
    });

    const loadMoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Carregar mais produtos"
    );

    expect(loadMoreButton).toBeTruthy();

    await act(async () => {
      loadMoreButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });

    expect(productMocks.toastError).toHaveBeenCalledWith(
      "Falha ao carregar pagina"
    );
    expect(loadMoreButton?.textContent).toBe("Carregar mais produtos");
    expect(loadMoreButton?.hasAttribute("disabled")).toBe(false);

    act(() => {
      root?.unmount();
    });
  });

  it("labels the product search field for assistive technologies", () => {
    const container = document.createElement("div");
    document.body.append(container);

    let root: Root | null = null;
    act(() => {
      root = createRoot(container);
      root.render(
        createElement(ProductsPanel, {
          analytics,
          appliedQuery: "",
          categories: [
            { id: "category-1", key: "categoria", name: "Categoria" },
          ],
          initialCursor: null,
          products: [product],
          role: "operator",
          settings: {
            idealMarkupPercent: 100,
            minimumMarkupPercent: 30,
          },
          status: "active",
        })
      );
    });

    const label = container.querySelector('label[for="products-search"]');
    const input = container.querySelector("#products-search");

    expect(label?.textContent).toBe("Buscar produtos");
    expect(input).toBeInstanceOf(HTMLInputElement);

    act(() => {
      root?.unmount();
    });
  });
});
