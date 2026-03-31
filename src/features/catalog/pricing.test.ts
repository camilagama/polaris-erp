import { describe, expect, it } from "vitest";
import { calculateSuggestedPrices } from "@/features/catalog/pricing";

describe("calculateSuggestedPrices", () => {
  it("calculates minimum and ideal price using markup over cost", () => {
    const result = calculateSuggestedPrices({
      costPrice: 100,
      currentPrice: 120,
      idealMarkupPercent: 50,
      minimumMarkupPercent: 20,
    });

    expect(result.minimumPrice).toBe(120);
    expect(result.idealPrice).toBe(150);
    expect(result.isBelowMinimum).toBe(false);
  });

  it("flags when current price is below the minimum suggestion", () => {
    const result = calculateSuggestedPrices({
      costPrice: 80,
      currentPrice: 90,
      idealMarkupPercent: 40,
      minimumMarkupPercent: 25,
    });

    expect(result.minimumPrice).toBe(100);
    expect(result.isBelowMinimum).toBe(true);
  });
});
