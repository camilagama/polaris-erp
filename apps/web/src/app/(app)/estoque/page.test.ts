import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/products/queries", () => ({
  getInventoryMovementsQuery: vi.fn(async () => ({
    filters: {
      from: "2026-03-01",
      productId: "product-1",
      to: "2026-03-31",
      type: "write_off",
    },
    items: [
      {
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        date: "2026-03-10",
        id: "writeoff-1",
        notes: "Caixa amassada",
        productId: "product-1",
        productName: "iPhone 15",
        quantity: -1,
        totalValue: 3500,
        type: "write_off",
        unitCost: 3500,
      },
    ],
    products: [{ id: "product-1", name: "iPhone 15" }],
  })),
  normalizeInventoryMovementFilters: vi.fn(() => ({
    from: "2026-03-01",
    productId: "product-1",
    to: "2026-03-31",
    type: "write_off",
  })),
}));

vi.mock("@/lib/app-session", () => ({
  requirePageAppContext: vi.fn(async () => ({
    organizationId: "org_dg_imports",
    role: "owner",
    userId: "user-1",
  })),
}));

import EstoquePage from "@/app/(app)/estoque/page";

describe("EstoquePage", () => {
  it("renders inventory movement filters and rows", async () => {
    const markup = renderToStaticMarkup(
      await EstoquePage({
        searchParams: Promise.resolve({
          from: "2026-03-01",
          productId: "product-1",
          to: "2026-03-31",
          type: "write_off",
        }),
      })
    );

    expect(markup).toContain("Movimentacoes de estoque");
    expect(markup).toContain("Todos os produtos");
    expect(markup).toContain("iPhone 15");
    expect(markup).toContain("Baixa");
    expect(markup).toContain("-1 un.");
    expect(markup).toContain("Caixa amassada");
    expect(markup).toContain("/produtos/product-1");
  });
});
