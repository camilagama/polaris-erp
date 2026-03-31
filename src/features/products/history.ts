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
  writeOffs,
}: {
  averageCost: number;
  currentStock: number;
  entries: InventoryHistoryEntryInput[];
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
