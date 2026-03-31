import { describe, expect, it } from "vitest";
import { buildSaleSnapshot } from "./calculations";

describe("buildSaleSnapshot", () => {
  it("calculates line totals and final total", () => {
    const result = buildSaleSnapshot([
      {
        productId: "product-1",
        productNameSnapshot: "Produto A",
        quantity: 2,
        unitCostSnapshot: 10,
        unitPriceSnapshot: 15.5,
      },
      {
        productId: "product-2",
        productNameSnapshot: "Produto B",
        quantity: 1,
        unitCostSnapshot: 8.2,
        unitPriceSnapshot: 20,
      },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.lineTotal).toBe(31);
    expect(result.items[1]?.lineTotal).toBe(20);
    expect(result.totalAmount).toBe(51);
  });

  it("rejects empty item list", () => {
    expect(() => buildSaleSnapshot([])).toThrowError(
      "Adicione pelo menos um item na venda."
    );
  });

  it("rejects invalid quantities", () => {
    expect(() =>
      buildSaleSnapshot([
        {
          productId: "product-1",
          productNameSnapshot: "Produto A",
          quantity: 0,
          unitCostSnapshot: 10,
          unitPriceSnapshot: 15,
        },
      ])
    ).toThrowError("Quantidade de venda deve ser maior que zero.");
  });
});
