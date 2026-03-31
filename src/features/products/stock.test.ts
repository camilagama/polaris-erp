import { describe, expect, it } from "vitest";
import { calculateWeightedCostPrice } from "@/features/products/stock";

describe("calculateWeightedCostPrice", () => {
  it("keeps the current cost when no stock is added", () => {
    expect(
      calculateWeightedCostPrice({
        currentCostPrice: 10,
        currentStock: 5,
        incomingQuantity: 0,
        incomingUnitCost: 15,
      })
    ).toBe(10);
  });

  it("calculates weighted average when adding stock", () => {
    expect(
      calculateWeightedCostPrice({
        currentCostPrice: 10,
        currentStock: 5,
        incomingQuantity: 5,
        incomingUnitCost: 20,
      })
    ).toBe(15);
  });

  it("uses incoming cost when product had no stock", () => {
    expect(
      calculateWeightedCostPrice({
        currentCostPrice: 0,
        currentStock: 0,
        incomingQuantity: 3,
        incomingUnitCost: 12.5,
      })
    ).toBe(12.5);
  });
});
