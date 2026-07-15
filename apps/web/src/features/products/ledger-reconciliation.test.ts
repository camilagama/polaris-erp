import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("stock ledger reconciliation", () => {
  it("summarizes every organization without exposing product-level data", async () => {
    const reconciliation = await import(
      "@/features/products/ledger-reconciliation"
    );

    expect(reconciliation.reconcileStockLedger).toEqual(expect.any(Function));

    const summary = await reconciliation.reconcileStockLedger({
      findDiscrepancies: async (organizationId) =>
        organizationId === "organization-with-difference"
          ? [
              {
                ledgerStock: 2,
                productId: "product-1",
                projectedStock: 3,
              },
            ]
          : [],
      listOrganizationIds: async () => [
        "organization-with-difference",
        "organization-in-balance",
      ],
    });

    expect(summary).toEqual({
      discrepancies: 1,
      organizationsScanned: 2,
      organizationsWithDiscrepancies: 1,
    });
  });
});
