import { describe, expect, it } from "vitest";
import { buildDashboardMetrics } from "@/features/dashboard/metrics";

describe("buildDashboardMetrics", () => {
  const selectedRange = {
    from: "2026-04-01",
    to: "2026-04-30",
  };

  it("ignores cancelled sales in totals, comparison and ranking", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      range: selectedRange,
      saleItems: [
        {
          imageBlurDataUrl: null,
          imageHeight: null,
          imageVersion: null,
          imageWidth: null,
          lineTotal: 100,
          occurredOn: "2026-04-10",
          productId: "product-1",
          productName: "Produto A",
          quantity: 2,
          status: "completed",
          unitCostSnapshot: 30,
        },
        {
          imageBlurDataUrl: null,
          imageHeight: null,
          imageVersion: null,
          imageWidth: null,
          lineTotal: 200,
          occurredOn: "2026-04-11",
          productId: "product-2",
          productName: "Produto B",
          quantity: 3,
          status: "cancelled",
          unitCostSnapshot: 50,
        },
      ],
      sales: [
        {
          feeAmount: 5,
          freightAmount: 10,
          occurredOn: "2026-04-10",
          status: "completed",
          totalAmount: 120,
        },
        {
          feeAmount: 0,
          freightAmount: 20,
          occurredOn: "2026-04-11",
          status: "cancelled",
          totalAmount: 240,
        },
      ],
    });

    expect(metrics.totalSold).toBe(120);
    expect(metrics.totalCosts).toBe(75);
    expect(metrics.totalResult).toBe(45);
    expect(metrics.totalSalesCount).toBe(1);
    expect(metrics.topProducts).toEqual([
      {
        id: "product-1",
        imageBlurDataUrl: null,
        imageHeight: null,
        imageVersion: null,
        imageWidth: null,
        name: "Produto A",
        quantitySold: 2,
        soldAmount: 100,
      },
    ]);
  });

  it("uses snapshot cost plus redirected costs to calculate the result", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      range: selectedRange,
      saleItems: [
        {
          imageBlurDataUrl: null,
          imageHeight: null,
          imageVersion: null,
          imageWidth: null,
          lineTotal: 180,
          occurredOn: "2026-04-10",
          productId: "product-1",
          productName: "Produto A",
          quantity: 3,
          status: "completed",
          unitCostSnapshot: 20,
        },
      ],
      sales: [
        {
          feeAmount: 6,
          freightAmount: 20,
          occurredOn: "2026-04-10",
          status: "completed",
          totalAmount: 210,
        },
      ],
    });

    expect(metrics.totalSold).toBe(210);
    expect(metrics.totalCosts).toBe(86);
    expect(metrics.totalResult).toBe(124);
  });

  it("aggregates by day for shorter intervals", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      range: {
        from: "2026-04-01",
        to: "2026-04-05",
      },
      saleItems: [
        {
          imageBlurDataUrl: null,
          imageHeight: null,
          imageVersion: null,
          imageWidth: null,
          lineTotal: 60,
          occurredOn: "2026-04-02",
          productId: "product-1",
          productName: "Produto A",
          quantity: 1,
          status: "completed",
          unitCostSnapshot: 20,
        },
      ],
      sales: [
        {
          feeAmount: 2,
          freightAmount: 15,
          occurredOn: "2026-04-02",
          status: "completed",
          totalAmount: 100,
        },
      ],
    });

    expect(metrics.periodGranularity).toBe("day");
    expect(metrics.periodComparison).toEqual([
      { costs: 0, label: "01/04", result: 0, sold: 0 },
      { costs: 37, label: "02/04", result: 63, sold: 100 },
      { costs: 0, label: "03/04", result: 0, sold: 0 },
      { costs: 0, label: "04/04", result: 0, sold: 0 },
      { costs: 0, label: "05/04", result: 0, sold: 0 },
    ]);
  });

  it("aggregates by month for longer intervals", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      range: {
        from: "2026-01-01",
        to: "2026-04-30",
      },
      saleItems: [
        {
          imageBlurDataUrl: null,
          imageHeight: null,
          imageVersion: null,
          imageWidth: null,
          lineTotal: 60,
          occurredOn: "2026-02-02",
          productId: "product-1",
          productName: "Produto A",
          quantity: 1,
          status: "completed",
          unitCostSnapshot: 20,
        },
        {
          imageBlurDataUrl: null,
          imageHeight: null,
          imageVersion: null,
          imageWidth: null,
          lineTotal: 70,
          occurredOn: "2026-04-12",
          productId: "product-2",
          productName: "Produto B",
          quantity: 1,
          status: "completed",
          unitCostSnapshot: 30,
        },
      ],
      sales: [
        {
          feeAmount: 2,
          freightAmount: 15,
          occurredOn: "2026-02-02",
          status: "completed",
          totalAmount: 100,
        },
        {
          feeAmount: 4,
          freightAmount: 10,
          occurredOn: "2026-04-12",
          status: "completed",
          totalAmount: 140,
        },
      ],
    });

    expect(metrics.periodGranularity).toBe("month");
    expect(metrics.periodComparison).toEqual([
      { costs: 0, label: "jan/26", result: 0, sold: 0 },
      { costs: 37, label: "fev/26", result: 63, sold: 100 },
      { costs: 0, label: "mar/26", result: 0, sold: 0 },
      { costs: 44, label: "abr/26", result: 96, sold: 140 },
    ]);
    expect(metrics.totalSalesCount).toBe(2);
    expect(metrics.totalSold).toBe(240);
    expect(metrics.totalCosts).toBe(81);
    expect(metrics.totalResult).toBe(159);
  });

  it("groups overflow categories into Outros", () => {
    const metrics = buildDashboardMetrics({
      inventory: [
        { categoryName: "Celulares", inventoryValue: 1000 },
        { categoryName: "Relogios", inventoryValue: 900 },
        { categoryName: "Caixas de som", inventoryValue: 800 },
        { categoryName: "Capinhas", inventoryValue: 700 },
        { categoryName: "Fones", inventoryValue: 600 },
        { categoryName: "Acessorios", inventoryValue: 500 },
      ],
      range: selectedRange,
      saleItems: [],
      sales: [],
    });

    expect(metrics.inventoryByCategory).toEqual([
      { categoryName: "Celulares", inventoryValue: 1000 },
      { categoryName: "Relogios", inventoryValue: 900 },
      { categoryName: "Caixas de som", inventoryValue: 800 },
      { categoryName: "Capinhas", inventoryValue: 700 },
      { categoryName: "Fones", inventoryValue: 600 },
      { categoryName: "Outros", inventoryValue: 500 },
    ]);
  });

  it("returns empty-friendly structures", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      range: selectedRange,
      saleItems: [],
      sales: [],
    });

    expect(metrics.totalSold).toBe(0);
    expect(metrics.totalCosts).toBe(0);
    expect(metrics.totalResult).toBe(0);
    expect(metrics.totalSalesCount).toBe(0);
    expect(metrics.topProducts).toEqual([]);
    expect(metrics.inventoryByCategory).toEqual([]);
  });
});
