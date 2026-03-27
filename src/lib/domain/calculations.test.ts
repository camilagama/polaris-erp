import { describe, expect, it } from "vitest";
import {
  calculateMovingAverageCost,
  calculatePurchaseTotal,
  calculatePurchaseUnitCost,
  calculateReceiptNetAmount,
  calculateSaleItemsSubtotal,
  calculateSaleOrderTotal,
} from "@/lib/domain/calculations";

describe("domain calculations", () => {
  it("sums the full purchase cost", () => {
    expect(
      calculatePurchaseTotal({
        cardFeeAmount: 7,
        otherCostsAmount: 3,
        shippingAmount: 10,
        supplierAmount: 100,
      })
    ).toBe(120);
  });

  it("calculates the unit cost from total and quantity", () => {
    expect(calculatePurchaseUnitCost(120, 4)).toBe(30);
  });

  it("recomputes moving average cost after a received purchase", () => {
    expect(
      calculateMovingAverageCost({
        currentAverageCost: 20,
        currentStock: 5,
        incomingQuantity: 3,
        incomingTotalCost: 90,
      })
    ).toBe(23.75);
  });

  it("returns zero moving average when stock collapses to zero", () => {
    expect(
      calculateMovingAverageCost({
        currentAverageCost: 20,
        currentStock: 0,
        incomingQuantity: 0,
        incomingTotalCost: 0,
      })
    ).toBe(0);
  });

  it("computes receipt net amount", () => {
    expect(calculateReceiptNetAmount(150, 12.5)).toBe(137.5);
  });

  it("computes sale subtotal and order total", () => {
    const subtotal = calculateSaleItemsSubtotal([
      { quantity: 2, unitSalePrice: 35 },
      { quantity: 1, unitSalePrice: 15 },
    ]);

    expect(subtotal).toBe(85);
    expect(
      calculateSaleOrderTotal({
        discountAmount: 5,
        itemsSubtotal: subtotal,
        shippingChargedAmount: 12,
      })
    ).toBe(92);
  });
});
