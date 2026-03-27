export const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseFloat(value);
  }

  return 0;
};

export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const calculatePurchaseTotal = (input: {
  supplierAmount: number;
  shippingAmount: number;
  cardFeeAmount: number;
  otherCostsAmount: number;
}) =>
  roundMoney(
    input.supplierAmount +
      input.shippingAmount +
      input.cardFeeAmount +
      input.otherCostsAmount
  );

export const calculatePurchaseUnitCost = (
  totalCost: number,
  quantity: number
) => roundMoney(totalCost / quantity);

export const calculateMovingAverageCost = (input: {
  currentStock: number;
  currentAverageCost: number;
  incomingQuantity: number;
  incomingTotalCost: number;
}) => {
  const newStock = input.currentStock + input.incomingQuantity;

  if (newStock <= 0) {
    return 0;
  }

  return roundMoney(
    (input.currentStock * input.currentAverageCost + input.incomingTotalCost) /
      newStock
  );
};

export const calculateSuggestedSalePrice = (input: {
  cost: number;
  feePercent: number;
  marginPercent: number;
}) => {
  const feeRate = input.feePercent / 100;
  const marginRate = input.marginPercent / 100;
  const denominator = 1 - feeRate - marginRate;

  if (input.cost <= 0) {
    return 0;
  }

  if (denominator <= 0) {
    return roundMoney(input.cost);
  }

  return roundMoney(input.cost / denominator);
};

export const calculateReceiptNetAmount = (
  grossAmount: number,
  feeAmount: number
) => roundMoney(grossAmount - feeAmount);

export const calculateSaleItemsSubtotal = (
  items: Array<{ quantity: number; unitSalePrice: number }>
) =>
  roundMoney(
    items.reduce((total, item) => total + item.quantity * item.unitSalePrice, 0)
  );

export const calculateSaleOrderTotal = (input: {
  itemsSubtotal: number;
  discountAmount: number;
  shippingChargedAmount: number;
}) =>
  roundMoney(
    input.itemsSubtotal - input.discountAmount + input.shippingChargedAmount
  );

export const deriveSaleStatus = (input: {
  hasChargeback: boolean;
  hasRefund: boolean;
  orderTotal: number;
  receivedGrossTotal: number;
}) => {
  if (input.hasChargeback) {
    return "chargeback" as const;
  }

  if (input.hasRefund) {
    return "refunded" as const;
  }

  if (input.receivedGrossTotal <= 0) {
    return "awaiting_payment" as const;
  }

  if (input.receivedGrossTotal < input.orderTotal) {
    return "partially_paid" as const;
  }

  return "paid" as const;
};
