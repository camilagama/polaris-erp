const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

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
  const normalizedCurrentStock = Math.max(0, currentStock);
  const normalizedIncomingQuantity = Math.max(0, incomingQuantity);

  if (normalizedIncomingQuantity === 0) {
    return roundCurrency(Math.max(0, currentCostPrice));
  }

  const totalStock = normalizedCurrentStock + normalizedIncomingQuantity;
  const currentTotalCost =
    Math.max(0, currentCostPrice) * normalizedCurrentStock;
  const incomingTotalCost =
    Math.max(0, incomingUnitCost) * normalizedIncomingQuantity;

  return roundCurrency((currentTotalCost + incomingTotalCost) / totalStock);
};
