const byNewestDate = <T extends { createdAt?: string; date: string }>(
  left: T,
  right: T
) => {
  const dateComparison = right.date.localeCompare(left.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
};

export interface InventoryHistoryEntryInput {
  createdAt?: string;
  date: string;
  id: string;
  quantity: number;
  unitCost: number;
}

export interface InventoryWriteOffInput extends InventoryHistoryEntryInput {
  notes: string | null;
  reason: "adjustment" | "operational";
}

export interface InventorySaleInput extends InventoryHistoryEntryInput {
  cancelledAt: string | null;
  saleId: string;
  status: "cancelled" | "completed";
}

const getWriteOffLabel = (reason: InventoryWriteOffInput["reason"]) => {
  if (reason === "operational") {
    return "Operacional";
  }

  return "Ajuste";
};

export const buildProductInventorySummary = ({
  averageCost,
  currentStock,
  entries,
  sales,
  writeOffs,
}: {
  averageCost: number;
  currentStock: number;
  entries: InventoryHistoryEntryInput[];
  sales: InventorySaleInput[];
  writeOffs: InventoryWriteOffInput[];
}) => {
  const totalCost = averageCost * currentStock;
  const totalEntries = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalWriteOffs = writeOffs.reduce(
    (sum, writeOff) => sum + writeOff.quantity,
    0
  );
  const totalWriteOffLoss = writeOffs.reduce(
    (sum, writeOff) => sum + writeOff.quantity * writeOff.unitCost,
    0
  );
  const historyItems = [
    ...entries.map((entry) => ({
      createdAt: entry.createdAt,
      date: entry.date,
      id: entry.id,
      label: "Entrada",
      notes: null,
      totalValue: entry.quantity * entry.unitCost,
      quantityLabel: `+${entry.quantity} un.`,
      unitCost: entry.unitCost,
      variant: "entry" as const,
    })),
    ...sales.flatMap((sale) => {
      const saleMovement = {
        createdAt: sale.createdAt,
        date: sale.date,
        id: `sale-${sale.id}`,
        label: "Venda",
        notes: `Venda ${sale.saleId}`,
        totalValue: sale.quantity * sale.unitCost,
        quantityLabel: `-${sale.quantity} un.`,
        unitCost: sale.unitCost,
        variant: "sale" as const,
      };

      if (!(sale.status === "cancelled" && sale.cancelledAt)) {
        return [saleMovement];
      }

      const reversalDate = sale.cancelledAt.slice(0, 10);

      return [
        saleMovement,
        {
          createdAt: sale.cancelledAt,
          date: reversalDate,
          id: `sale-reversal-${sale.id}`,
          label: "Estorno de venda",
          notes: `Venda ${sale.saleId} cancelada`,
          totalValue: sale.quantity * sale.unitCost,
          quantityLabel: `+${sale.quantity} un.`,
          unitCost: sale.unitCost,
          variant: "saleReversal" as const,
        },
      ];
    }),
    ...writeOffs.map((writeOff) => ({
      createdAt: writeOff.createdAt,
      date: writeOff.date,
      id: writeOff.id,
      label: getWriteOffLabel(writeOff.reason),
      notes: writeOff.notes,
      totalValue: writeOff.quantity * writeOff.unitCost,
      quantityLabel: `-${writeOff.quantity} un.`,
      unitCost: writeOff.unitCost,
      variant: "writeOff" as const,
    })),
  ].sort(byNewestDate);

  return {
    historyItems,
    totalCost,
    totalEntries,
    totalWriteOffLoss,
    totalWriteOffs,
  };
};
