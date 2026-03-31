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
          quantity: 3,
          unitCost: 10,
        },
      ],
      writeOffs: [
        {
          createdAt: "2026-03-31T11:00:00.000Z",
          date: "2026-03-31",
          id: "writeoff-1",
          notes: "Caixa amassada",
          quantity: 1,
          reason: "damage",
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
        label: "Avaria",
        notes: "Caixa amassada",
        quantityLabel: "-1 un.",
        totalValue: 12.5,
        unitCost: 12.5,
        variant: "writeOff",
      },
      {
        createdAt: "2026-03-31T10:00:00.000Z",
        date: "2026-03-30",
        id: "entry-1",
        label: "Entrada",
        notes: null,
        quantityLabel: "+3 un.",
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
          quantity: 1,
          unitCost: 10,
        },
      ],
      writeOffs: [
        {
          createdAt: "2026-03-31T12:00:00.000Z",
          date: "2026-03-31",
          id: "writeoff-1",
          notes: null,
          quantity: 1,
          reason: "loss",
          unitCost: 10,
        },
      ],
    });

    expect(summary.historyItems[0]?.id).toBe("writeoff-1");
    expect(summary.historyItems[1]?.id).toBe("entry-1");
  });
});
