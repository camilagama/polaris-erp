import {
  normalizeNonNegativeNumber,
  roundCurrency,
} from "@/lib/domain/currency";
import type { SalePaymentFeePayer, SalePaymentMethod } from "./contracts";

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

export interface CalculateSaleFinancialsInput {
  additionalAmount: number;
  discountAmount: number;
  freightAmount: number;
  installmentFeePercent: number;
  itemSubtotal: number;
  paymentFeePayer: SalePaymentFeePayer;
  paymentInstallments: number;
  paymentMethod: SalePaymentMethod;
}

export interface SaleFinancials {
  baseAmount: number;
  chargedAmount: number;
  customerFeeAmount: number;
  feeAmount: number;
  paymentFeePercent: number;
  sellerFeeAmount: number;
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

export const calculateSaleFinancials = ({
  additionalAmount,
  discountAmount,
  freightAmount,
  installmentFeePercent,
  itemSubtotal,
  paymentFeePayer,
  paymentInstallments,
  paymentMethod,
}: CalculateSaleFinancialsInput): SaleFinancials => {
  const normalizedSubtotal = roundCurrency(
    normalizeNonNegativeNumber(itemSubtotal)
  );
  const normalizedAdditionalAmount = roundCurrency(
    normalizeNonNegativeNumber(additionalAmount)
  );
  const normalizedDiscountAmount = roundCurrency(
    normalizeNonNegativeNumber(discountAmount)
  );
  const normalizedFreightAmount = roundCurrency(
    normalizeNonNegativeNumber(freightAmount)
  );
  const normalizedInstallmentFeePercent = roundCurrency(
    normalizeNonNegativeNumber(installmentFeePercent)
  );
  const baseAmount = roundCurrency(
    normalizedSubtotal +
      normalizedFreightAmount +
      normalizedAdditionalAmount -
      normalizedDiscountAmount
  );

  if (baseAmount < 0) {
    throw new Error(
      "Desconto nao pode ser maior que o subtotal somado com frete e adicional."
    );
  }

  if (paymentMethod === "pix") {
    if (paymentInstallments !== 0) {
      throw new Error("Pix nao aceita parcelamento.");
    }

    if (paymentFeePayer !== "not_applicable") {
      throw new Error("Pix nao possui responsavel por taxa.");
    }

    return {
      baseAmount,
      chargedAmount: baseAmount,
      customerFeeAmount: 0,
      feeAmount: 0,
      paymentFeePercent: 0,
      sellerFeeAmount: 0,
      totalAmount: baseAmount,
    };
  }

  if (paymentInstallments < 1 || paymentInstallments > 12) {
    throw new Error("Selecione um parcelamento valido para o cartao.");
  }

  if (paymentFeePayer !== "seller" && paymentFeePayer !== "customer") {
    throw new Error("Selecione quem paga a taxa do cartao.");
  }

  const calculatedFeeAmount = roundCurrency(
    baseAmount * (normalizedInstallmentFeePercent / 100)
  );

  if (paymentFeePayer === "seller") {
    return {
      baseAmount,
      chargedAmount: baseAmount,
      customerFeeAmount: 0,
      feeAmount: calculatedFeeAmount,
      paymentFeePercent: normalizedInstallmentFeePercent,
      sellerFeeAmount: calculatedFeeAmount,
      totalAmount: baseAmount,
    };
  }

  const chargedAmount = roundCurrency(baseAmount + calculatedFeeAmount);

  return {
    baseAmount,
    chargedAmount,
    customerFeeAmount: calculatedFeeAmount,
    feeAmount: 0,
    paymentFeePercent: 0,
    sellerFeeAmount: 0,
    totalAmount: baseAmount,
  };
};
