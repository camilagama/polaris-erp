import { describe, expect, it } from "vitest";
import {
  buildSaleSnapshot,
  calculateSaleFinancials,
} from "@/features/sales/calculations";

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

describe("calculateSaleFinancials", () => {
  it("keeps pix charged amount equal to the sale total", () => {
    const result = calculateSaleFinancials({
      additionalAmount: 10,
      discountAmount: 5,
      freightAmount: 15,
      installmentFeePercent: 99,
      itemSubtotal: 100,
      paymentFeePayer: "not_applicable",
      paymentInstallments: 0,
      paymentMethod: "pix",
    });

    expect(result).toMatchObject({
      baseAmount: 120,
      chargedAmount: 120,
      customerFeeAmount: 0,
      feeAmount: 0,
      paymentFeePercent: 0,
      sellerFeeAmount: 0,
      totalAmount: 120,
    });
  });

  it("records seller-paid card fee as cost without inflating sale revenue", () => {
    const result = calculateSaleFinancials({
      additionalAmount: 0,
      discountAmount: 0,
      freightAmount: 20,
      installmentFeePercent: 3,
      itemSubtotal: 100,
      paymentFeePayer: "seller",
      paymentInstallments: 3,
      paymentMethod: "card",
    });

    expect(result).toMatchObject({
      baseAmount: 120,
      chargedAmount: 120,
      customerFeeAmount: 0,
      feeAmount: 3.6,
      paymentFeePercent: 3,
      sellerFeeAmount: 3.6,
      totalAmount: 120,
    });
  });

  it("moves the card fee to charged amount when the customer pays it", () => {
    const result = calculateSaleFinancials({
      additionalAmount: 5,
      discountAmount: 0,
      freightAmount: 15,
      installmentFeePercent: 2.5,
      itemSubtotal: 80,
      paymentFeePayer: "customer",
      paymentInstallments: 2,
      paymentMethod: "card",
    });

    expect(result).toMatchObject({
      baseAmount: 100,
      chargedAmount: 102.5,
      customerFeeAmount: 2.5,
      feeAmount: 0,
      paymentFeePercent: 0,
      sellerFeeAmount: 0,
      totalAmount: 100,
    });
  });

  it("rounds fee amounts using currency precision", () => {
    const result = calculateSaleFinancials({
      additionalAmount: 0,
      discountAmount: 0,
      freightAmount: 0,
      installmentFeePercent: 2.99,
      itemSubtotal: 99.99,
      paymentFeePayer: "customer",
      paymentInstallments: 3,
      paymentMethod: "card",
    });

    expect(result.customerFeeAmount).toBe(2.99);
    expect(result.chargedAmount).toBe(102.98);
  });

  it("rejects when discount exceeds the transaction base amount", () => {
    expect(() =>
      calculateSaleFinancials({
        additionalAmount: 0,
        discountAmount: 200,
        freightAmount: 0,
        installmentFeePercent: 0,
        itemSubtotal: 100,
        paymentFeePayer: "not_applicable",
        paymentInstallments: 0,
        paymentMethod: "pix",
      })
    ).toThrowError(
      "Desconto nao pode ser maior que o subtotal somado com frete e adicional."
    );
  });
});
