import { describe, expect, it } from "vitest";
import { buildDashboardMetrics } from "@/features/dashboard/metrics";

describe("buildDashboardMetrics", () => {
  const referenceDate = new Date("2026-04-15T12:00:00.000Z");

  it("ignores cancelled sales in revenue, result and ranking", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      referenceDate,
      saleItems: [
        {
          lineTotal: 100,
          occurredOn: "2026-04-10",
          productId: "product-1",
          productName: "Produto A",
          quantity: 2,
          status: "completed",
          unitCostSnapshot: 30,
        },
        {
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
          feeAmount: 10,
          freightAmount: 10,
          occurredOn: "2026-04-10",
          status: "completed",
          totalAmount: 120,
        },
        {
          feeAmount: 20,
          freightAmount: 20,
          occurredOn: "2026-04-11",
          status: "cancelled",
          totalAmount: 240,
        },
      ],
    });

    expect(metrics.monthlySold).toBe(120);
    expect(metrics.monthlyCosts).toBe(80);
    expect(metrics.monthlyResult).toBe(40);
    expect(metrics.monthlySalesCount).toBe(1);
    expect(metrics.topProducts).toEqual([
      {
        id: "product-1",
        name: "Produto A",
        quantitySold: 2,
        soldAmount: 100,
      },
    ]);
  });

  it("uses snapshot cost plus redirected costs to calculate the monthly result", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      referenceDate,
      saleItems: [
        {
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
          feeAmount: 10,
          freightAmount: 20,
          occurredOn: "2026-04-10",
          status: "completed",
          totalAmount: 210,
        },
      ],
    });

    expect(metrics.monthlySold).toBe(210);
    expect(metrics.monthlyCosts).toBe(90);
    expect(metrics.monthlyResult).toBe(120);
  });

  it("calculates monthly sales count with sold and costs", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      referenceDate,
      saleItems: [
        {
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
          feeAmount: 5,
          freightAmount: 15,
          occurredOn: "2026-04-02",
          status: "completed",
          totalAmount: 100,
        },
        {
          feeAmount: 10,
          freightAmount: 10,
          occurredOn: "2026-04-12",
          status: "completed",
          totalAmount: 140,
        },
      ],
    });

    expect(metrics.monthlySalesCount).toBe(2);
    expect(metrics.monthlySold).toBe(240);
    expect(metrics.monthlyCosts).toBe(60);
    expect(metrics.monthlyResult).toBe(180);
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
      referenceDate,
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

  it("keeps category distribution stable with few categories", () => {
    const metrics = buildDashboardMetrics({
      inventory: [
        { categoryName: "Celulares", inventoryValue: 1000 },
        { categoryName: "Fones", inventoryValue: 600 },
      ],
      referenceDate,
      saleItems: [],
      sales: [],
    });

    expect(metrics.inventoryByCategory).toEqual([
      { categoryName: "Celulares", inventoryValue: 1000 },
      { categoryName: "Fones", inventoryValue: 600 },
    ]);
  });

  it("returns empty-friendly structures", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      referenceDate,
      saleItems: [],
      sales: [],
    });

    expect(metrics.monthlySold).toBe(0);
    expect(metrics.monthlyCosts).toBe(0);
    expect(metrics.monthlyResult).toBe(0);
    expect(metrics.monthlySalesCount).toBe(0);
    expect(metrics.topProducts).toEqual([]);
    expect(metrics.inventoryByCategory).toEqual([]);
  });
});
