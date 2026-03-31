import { describe, expect, it } from "vitest";
import {
  applyStockAddition,
  applyStockWriteOff,
  calculateWeightedCostPrice,
} from "@/features/products/stock";

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

  it("returns the next stock snapshot for a stock addition", () => {
    expect(
      applyStockAddition({
        currentCostPrice: 10,
        currentStock: 5,
        incomingQuantity: 3,
        incomingUnitCost: 16,
      })
    ).toEqual({
      nextCostPrice: 12.25,
      nextStock: 8,
    });
  });

  it("rejects stock write-off larger than available stock", () => {
    expect(() =>
      applyStockWriteOff({
        currentStock: 2,
        quantity: 3,
      })
    ).toThrowError("A baixa nao pode ser maior que o estoque atual.");
  });

  it("returns the next stock snapshot for a write-off", () => {
    expect(
      applyStockWriteOff({
        currentStock: 7,
        quantity: 2,
      })
    ).toEqual({
      nextStock: 5,
    });
  });
});
