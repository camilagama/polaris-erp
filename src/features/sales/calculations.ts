import {
  normalizeNonNegativeNumber,
  roundCurrency,
} from "@/lib/domain/currency";

interface SaleDraftItem {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitCostSnapshot: number;
  unitPriceSnapshot: number;
}

interface SaleSnapshotItem extends SaleDraftItem {
  lineTotal: number;
}

interface SaleSnapshotResult {
  items: SaleSnapshotItem[];
  totalAmount: number;
}

export const buildSaleSnapshot = (
  items: SaleDraftItem[]
): SaleSnapshotResult => {
  if (items.length === 0) {
    throw new Error("Adicione pelo menos um item na venda.");
  }

  const normalizedItems = items.map((item) => {
    if (item.quantity <= 0) {
      throw new Error("Quantidade de venda deve ser maior que zero.");
    }

    if (item.unitPriceSnapshot < 0) {
      throw new Error("Preco de venda nao pode ser negativo.");
    }

    if (item.unitCostSnapshot < 0) {
      throw new Error("Custo de item nao pode ser negativo.");
    }

    const lineTotal = roundCurrency(
      item.quantity * normalizeNonNegativeNumber(item.unitPriceSnapshot)
    );

    return {
      ...item,
      lineTotal,
      unitCostSnapshot: roundCurrency(
        normalizeNonNegativeNumber(item.unitCostSnapshot)
      ),
      unitPriceSnapshot: roundCurrency(
        normalizeNonNegativeNumber(item.unitPriceSnapshot)
      ),
    };
  });

  const totalAmount = roundCurrency(
    normalizedItems.reduce((acc, item) => acc + item.lineTotal, 0)
  );

  return {
    items: normalizedItems,
    totalAmount,
  };
};
