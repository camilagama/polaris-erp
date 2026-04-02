import { describe, expect, it } from "vitest";
import { buildDashboardMetrics } from "@/features/dashboard/metrics";

describe("buildDashboardMetrics", () => {
  const referenceDate = new Date("2026-04-15T12:00:00.000Z");

  it("ignores cancelled sales in revenue, result and ranking", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      products: [],
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
          occurredOn: "2026-04-10",
          status: "completed",
          totalAmount: 120,
        },
        {
          occurredOn: "2026-04-11",
          status: "cancelled",
          totalAmount: 240,
        },
      ],
      stockEntries: [],
    });

    expect(metrics.monthlyRevenue).toBe(120);
    expect(metrics.monthlyResult).toBe(60);
    expect(metrics.topProducts).toEqual([
      {
        id: "product-1",
        name: "Produto A",
        quantitySold: 2,
        soldAmount: 100,
      },
    ]);
  });

  it("uses snapshot cost to calculate the monthly result", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      products: [],
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
          occurredOn: "2026-04-10",
          status: "completed",
          totalAmount: 210,
        },
      ],
      stockEntries: [],
    });

    expect(metrics.monthlyResult).toBe(150);
  });

  it("uses only stock entries from the reference month for restock investment", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      products: [],
      referenceDate,
      saleItems: [],
      sales: [],
      stockEntries: [
        {
          quantity: 2,
          stockedOn: "2026-04-02",
          unitCost: 50,
        },
        {
          quantity: 1,
          stockedOn: "2026-03-30",
          unitCost: 999,
        },
      ],
    });

    expect(metrics.monthlyRestockInvestment).toBe(100);
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
      products: [],
      referenceDate,
      saleItems: [],
      sales: [],
      stockEntries: [],
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
      products: [],
      referenceDate,
      saleItems: [],
      sales: [],
      stockEntries: [],
    });

    expect(metrics.inventoryByCategory).toEqual([
      { categoryName: "Celulares", inventoryValue: 1000 },
      { categoryName: "Fones", inventoryValue: 600 },
    ]);
  });

  it("returns empty-friendly structures and prioritizes critical stock alerts", () => {
    const metrics = buildDashboardMetrics({
      inventory: [],
      products: [
        { archivedAt: null, id: "product-1", name: "Produto Zerado", stock: 0 },
        { archivedAt: null, id: "product-2", name: "Produto Baixo", stock: 2 },
        {
          archivedAt: new Date("2026-04-01T00:00:00.000Z"),
          id: "product-3",
          name: "Arquivado",
          stock: 0,
        },
      ],
      referenceDate,
      saleItems: [],
      sales: [],
      stockEntries: [],
    });

    expect(metrics.monthlyRevenue).toBe(0);
    expect(metrics.monthlyResult).toBe(0);
    expect(metrics.monthlyRestockInvestment).toBe(0);
    expect(metrics.criticalStockCount).toBe(1);
    expect(metrics.topProducts).toEqual([]);
    expect(metrics.inventoryByCategory).toEqual([]);
    expect(metrics.restockAlerts).toEqual([
      {
        id: "product-1",
        name: "Produto Zerado",
        severity: "critical",
        stock: 0,
      },
      {
        id: "product-2",
        name: "Produto Baixo",
        severity: "low",
        stock: 2,
      },
    ]);
  });
});
