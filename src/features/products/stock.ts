const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeNonNegative = (value: number) => Math.max(0, value);

export const calculateWeightedCostPrice = ({
  currentCostPrice,
  currentStock,
  incomingQuantity,
  incomingUnitCost,
}: {
  currentCostPrice: number;
  currentStock: number;
  incomingQuantity: number;
  incomingUnitCost: number;
}) => {
  const normalizedCurrentStock = normalizeNonNegative(currentStock);
  const normalizedIncomingQuantity = normalizeNonNegative(incomingQuantity);

  if (normalizedIncomingQuantity === 0) {
    return roundCurrency(normalizeNonNegative(currentCostPrice));
  }

  const totalStock = normalizedCurrentStock + normalizedIncomingQuantity;
  const currentTotalCost =
    normalizeNonNegative(currentCostPrice) * normalizedCurrentStock;
  const incomingTotalCost =
    normalizeNonNegative(incomingUnitCost) * normalizedIncomingQuantity;

  return roundCurrency((currentTotalCost + incomingTotalCost) / totalStock);
};

export const applyStockAddition = ({
  currentCostPrice,
  currentStock,
  incomingQuantity,
  incomingUnitCost,
}: {
  currentCostPrice: number;
  currentStock: number;
  incomingQuantity: number;
  incomingUnitCost: number;
}) => {
  const normalizedCurrentStock = normalizeNonNegative(currentStock);
  const normalizedIncomingQuantity = normalizeNonNegative(incomingQuantity);

  return {
    nextCostPrice: calculateWeightedCostPrice({
      currentCostPrice,
      currentStock: normalizedCurrentStock,
      incomingQuantity: normalizedIncomingQuantity,
      incomingUnitCost,
    }),
    nextStock: normalizedCurrentStock + normalizedIncomingQuantity,
  };
};

export const applyStockWriteOff = ({
  currentStock,
  quantity,
}: {
  currentStock: number;
  quantity: number;
}) => {
  const normalizedCurrentStock = normalizeNonNegative(currentStock);
  const normalizedQuantity = normalizeNonNegative(quantity);

  if (normalizedQuantity > normalizedCurrentStock) {
    throw new Error("A baixa nao pode ser maior que o estoque atual.");
  }

  return {
    nextStock: normalizedCurrentStock - normalizedQuantity,
  };
};
