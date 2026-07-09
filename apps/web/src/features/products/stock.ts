import {
  normalizeMoney,
  normalizeNonNegativeNumber,
  roundCurrency,
} from "@/lib/domain/currency";

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
  const normalizedCurrentStock = normalizeNonNegativeNumber(currentStock);
  const normalizedIncomingQuantity =
    normalizeNonNegativeNumber(incomingQuantity);

  if (normalizedIncomingQuantity === 0) {
    return normalizeMoney(currentCostPrice);
  }

  const totalStock = normalizedCurrentStock + normalizedIncomingQuantity;
  const currentTotalCost =
    normalizeNonNegativeNumber(currentCostPrice) * normalizedCurrentStock;
  const incomingTotalCost =
    normalizeNonNegativeNumber(incomingUnitCost) * normalizedIncomingQuantity;

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
  const normalizedCurrentStock = normalizeNonNegativeNumber(currentStock);
  const normalizedIncomingQuantity =
    normalizeNonNegativeNumber(incomingQuantity);

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
  const normalizedCurrentStock = normalizeNonNegativeNumber(currentStock);
  const normalizedQuantity = normalizeNonNegativeNumber(quantity);

  if (normalizedQuantity > normalizedCurrentStock) {
    throw new Error("A baixa nao pode ser maior que o estoque atual.");
  }

  return {
    nextStock: normalizedCurrentStock - normalizedQuantity,
  };
};
