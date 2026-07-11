import { describe, expect, it } from "vitest";
import {
  buildListingPlanChecks,
  validateListingPlanResults,
} from "../../../../scripts/analyze-listing-plans";

describe("listing plan analysis", () => {
  it("includes search listing checks only when a search term is provided", () => {
    expect(buildListingPlanChecks("").map((check) => check.name)).toEqual([
      "products-active-list",
      "products-archived-list",
      "sales-list",
    ]);

    expect(
      buildListingPlanChecks("cliente").map((check) => check.name)
    ).toEqual([
      "products-active-list",
      "products-archived-list",
      "sales-list",
      "products-active-search",
      "sales-customer-search",
    ]);
  });

  it("fails certification when representative data is required but any check is skipped", () => {
    expect(() =>
      validateListingPlanResults(
        [
          {
            executionMs: 1.2,
            expectedIndexes: ["products_active_list_idx"],
            measuredRows: 42,
            name: "products-active-list",
            planningMs: 0.8,
            representative: false,
            result: "skipped-small-dataset",
            usedIndexes: [],
          },
        ],
        { requireRepresentative: true }
      )
    ).toThrow(
      "Representative listing-plan evidence required, but these checks used small datasets: products-active-list"
    );
  });

  it("allows small dataset skips when certification mode is not required", () => {
    expect(() =>
      validateListingPlanResults(
        [
          {
            executionMs: 1.2,
            expectedIndexes: ["products_active_list_idx"],
            measuredRows: 42,
            name: "products-active-list",
            planningMs: 0.8,
            representative: false,
            result: "skipped-small-dataset",
            usedIndexes: [],
          },
        ],
        { requireRepresentative: false }
      )
    ).not.toThrow();
  });
});
