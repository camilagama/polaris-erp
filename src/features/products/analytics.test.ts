import { describe, expect, it } from "vitest";
import {
  buildProductAnalytics,
  buildProductSalesHistoryMetrics,
} from "@/features/products/analytics";

describe("buildProductAnalytics", () => {
  it("summarizes active inventory and groups categories", () => {
    const analytics = buildProductAnalytics({
      inventory: [
        {
          archivedAt: null,
          categoryName: "Celulares",
          costPrice: 100,
          stock: 3,
        },
        {
          archivedAt: null,
          categoryName: "Fones",
          costPrice: 50,
          stock: 0,
        },
        {
          archivedAt: null,
          categoryName: "Fones",
          costPrice: 20,
          stock: 2,
        },
        {
          archivedAt: new Date("2026-03-01T00:00:00.000Z"),
          categoryName: "Arquivados",
          costPrice: 999,
          stock: 4,
        },
      ],
      sales: [],
      today: "2026-04-30",
    });

    expect(analytics.totalUnitsInStock).toBe(5);
    expect(analytics.totalInventoryInvestment).toBe(340);
    expect(analytics.totalActiveProductsInStock).toBe(2);
    expect(analytics.totalZeroStockProducts).toBe(1);
    expect(analytics.inventoryByCategory).toEqual([
      {
        categoryName: "Celulares",
        inventoryValue: 300,
      },
      {
        categoryName: "Fones",
        inventoryValue: 40,
      },
    ]);
  });

  it("builds the recent sales series for the last 30 days", () => {
    const analytics = buildProductAnalytics({
      inventory: [],
      sales: [
        {
          lineTotal: 120,
          occurredOn: "2026-04-29",
          quantity: 2,
          status: "completed",
        },
        {
          lineTotal: 80,
          occurredOn: "2026-04-29",
          quantity: 1,
          status: "completed",
        },
        {
          lineTotal: 999,
          occurredOn: "2026-04-20",
          quantity: 5,
          status: "cancelled",
        },
      ],
      today: "2026-04-30",
    });

    expect(analytics.recentSales.at(-2)).toEqual({
      label: "29/04",
      quantitySold: 3,
      soldAmount: 200,
    });
    expect(analytics.recentSales.at(-1)).toEqual({
      label: "30/04",
      quantitySold: 0,
      soldAmount: 0,
    });
  });
});

describe("buildProductSalesHistoryMetrics", () => {
  it("ignores cancelled sales and aggregates history", () => {
    const metrics = buildProductSalesHistoryMetrics({
      sales: [
        {
          lineTotal: 100,
          occurredOn: "2026-04-01",
          quantity: 2,
          status: "completed",
        },
        {
          lineTotal: 120,
          occurredOn: "2026-04-02",
          quantity: 3,
          status: "cancelled",
        },
        {
          lineTotal: 80,
          occurredOn: "2026-04-03",
          quantity: 1,
          status: "completed",
        },
      ],
    });

    expect(metrics.totalQuantitySold).toBe(3);
    expect(metrics.totalSoldAmount).toBe(180);
    expect(metrics.trend).toEqual([
      {
        label: "01/04",
        quantitySold: 2,
        soldAmount: 100,
      },
      {
        label: "03/04",
        quantitySold: 1,
        soldAmount: 80,
      },
    ]);
  });
});
