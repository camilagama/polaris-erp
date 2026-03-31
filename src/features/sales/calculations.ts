const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeNonNegative = (value: number) => Math.max(0, value);

export interface SaleDraftItem {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitCostSnapshot: number;
  unitPriceSnapshot: number;
}

export interface SaleSnapshotItem extends SaleDraftItem {
  lineTotal: number;
}

export interface SaleSnapshotResult {
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
      item.quantity * normalizeNonNegative(item.unitPriceSnapshot)
    );

    return {
      ...item,
      lineTotal,
      unitCostSnapshot: roundCurrency(
        normalizeNonNegative(item.unitCostSnapshot)
      ),
      unitPriceSnapshot: roundCurrency(
        normalizeNonNegative(item.unitPriceSnapshot)
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
