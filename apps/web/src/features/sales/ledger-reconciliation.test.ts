import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("sale financial reconciliation", () => {
  it("returns persisted financial divergences without applying a repair", async () => {
    const { db } = await import("@polaris/db");
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          expectedChargedAmount: "110.00",
          expectedFeeAmount: "0.00",
          expectedTotalAmount: "100.00",
          saleId: "sale-1",
          storedChargedAmount: "100.00",
          storedFeeAmount: "0.00",
          storedTotalAmount: "100.00",
        },
      ],
    });
    const mockedDb = db as unknown as {
      transaction: ReturnType<typeof vi.fn>;
    };
    mockedDb.transaction.mockImplementation(
      async (callback: (tx: { execute: typeof execute }) => Promise<unknown>) =>
        callback({ execute })
    );

    const { findSaleFinancialDiscrepancies } = await import(
      "@/features/sales/ledger-reconciliation"
    );

    await expect(
      findSaleFinancialDiscrepancies("organization-1")
    ).resolves.toEqual([expect.objectContaining({ saleId: "sale-1" })]);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
