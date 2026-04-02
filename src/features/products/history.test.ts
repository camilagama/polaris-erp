import { describe, expect, it } from "vitest";
import { buildProductInventorySummary } from "@/features/products/history";

describe("buildProductInventorySummary", () => {
  it("calculates totals and merges movement history", () => {
    const summary = buildProductInventorySummary({
      averageCost: 12.5,
      currentStock: 4,
      entries: [
        {
          createdAt: "2026-03-31T10:00:00.000Z",
          date: "2026-03-30",
          id: "entry-1",
          isInitial: true,
          quantity: 3,
          unitCost: 10,
        },
      ],
      sales: [
        {
          cancelledAt: null,
          createdAt: "2026-03-31T10:30:00.000Z",
          date: "2026-03-31",
          id: "sale-item-1",
          quantity: 2,
          saleId: "sale-1",
          status: "completed",
          unitCost: 12.5,
        },
      ],
      writeOffs: [
        {
          createdAt: "2026-03-31T11:00:00.000Z",
          date: "2026-03-31",
          id: "writeoff-1",
          notes: "Caixa amassada",
          quantity: 1,
          reason: "operational",
          unitCost: 12.5,
        },
      ],
    });

    expect(summary.totalCost).toBe(50);
    expect(summary.totalEntries).toBe(3);
    expect(summary.totalWriteOffs).toBe(1);
    expect(summary.totalWriteOffLoss).toBe(12.5);
    expect(summary.historyItems).toEqual([
      {
        createdAt: "2026-03-31T11:00:00.000Z",
        date: "2026-03-31",
        id: "writeoff-1",
        label: "Operacional",
        notes: "Caixa amassada",
        quantityLabel: "-1 un.",
        totalValue: 12.5,
        unitCost: 12.5,
        variant: "writeOff",
      },
      {
        createdAt: "2026-03-31T10:30:00.000Z",
        date: "2026-03-31",
        id: "sale-sale-item-1",
        label: "Venda",
        notes: "Venda sale-1",
        quantityLabel: "-2 un.",
        totalValue: 25,
        unitCost: 12.5,
        variant: "sale",
      },
      {
        createdAt: "2026-03-31T10:00:00.000Z",
        date: "2026-03-30",
        id: "entry-1",
        label: "Cadastro",
        notes: null,
        quantityLabel: "+3 un.",
        sortPriority: 1,
        totalValue: 30,
        unitCost: 10,
        variant: "entry",
      },
    ]);
  });

  it("uses createdAt to break ties when movement dates are equal", () => {
    const summary = buildProductInventorySummary({
      averageCost: 10,
      currentStock: 2,
      entries: [
        {
          createdAt: "2026-03-31T09:00:00.000Z",
          date: "2026-03-31",
          id: "entry-1",
          isInitial: true,
          quantity: 1,
          unitCost: 10,
        },
      ],
      sales: [],
      writeOffs: [
        {
          createdAt: "2026-03-31T12:00:00.000Z",
          date: "2026-03-31",
          id: "writeoff-1",
          notes: null,
          quantity: 1,
          reason: "operational",
          unitCost: 10,
        },
      ],
    });

    expect(summary.historyItems[0]?.id).toBe("writeoff-1");
    expect(summary.historyItems[1]?.id).toBe("entry-1");
  });

  it("keeps the initial registration as the oldest movement even when dates would move it", () => {
    const summary = buildProductInventorySummary({
      averageCost: 10,
      currentStock: 3,
      entries: [
        {
          createdAt: "2026-03-31T09:00:00.000Z",
          date: "2026-04-01",
          id: "entry-initial",
          isInitial: true,
          quantity: 2,
          unitCost: 10,
        },
        {
          createdAt: "2026-04-02T09:00:00.000Z",
          date: "2026-03-01",
          id: "entry-backfilled",
          quantity: 1,
          unitCost: 10,
        },
      ],
      sales: [],
      writeOffs: [],
    });

    expect(summary.historyItems.at(-1)?.id).toBe("entry-initial");
    expect(summary.historyItems.at(-1)?.label).toBe("Cadastro");
  });

  it("adds stock reversal entry when a sale is cancelled", () => {
    const summary = buildProductInventorySummary({
      averageCost: 8,
      currentStock: 5,
      entries: [],
      sales: [
        {
          cancelledAt: "2026-04-01T10:00:00.000Z",
          createdAt: "2026-03-31T10:00:00.000Z",
          date: "2026-03-31",
          id: "sale-item-1",
          quantity: 2,
          saleId: "sale-1",
          status: "cancelled",
          unitCost: 8,
        },
      ],
      writeOffs: [],
    });

    expect(summary.historyItems).toEqual([
      {
        createdAt: "2026-04-01T10:00:00.000Z",
        date: "2026-04-01",
        id: "sale-reversal-sale-item-1",
        label: "Estorno de venda",
        notes: "Venda sale-1 cancelada",
        quantityLabel: "+2 un.",
        totalValue: 16,
        unitCost: 8,
        variant: "saleReversal",
      },
      {
        createdAt: "2026-03-31T10:00:00.000Z",
        date: "2026-03-31",
        id: "sale-sale-item-1",
        label: "Venda",
        notes: "Venda sale-1",
        quantityLabel: "-2 un.",
        totalValue: 16,
        unitCost: 8,
        variant: "sale",
      },
    ]);
  });
});
