import { roundMoney, toNumber } from "@/lib/domain/calculations";

export type PaymentEventStatus = "pending" | "canceled" | "confirmed";
export type PaymentEventType = "payment" | "refund" | "chargeback";
export type PaymentMethodType =
  | "pix"
  | "cash"
  | "card_debit"
  | "card_credit"
  | "payment_link"
  | "bank_transfer"
  | "other";
export type SalePaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "refunded"
  | "chargeback";

export interface PaymentEventLike {
  feeAmount?: number | string | null;
  grossAmount?: number | string | null;
  netAmount?: number | string | null;
  status: PaymentEventStatus;
  type: PaymentEventType;
}

export interface PaymentLedgerSummary {
  amountDue: number;
  confirmedChargebackGross: number;
  confirmedFeeTotal: number;
  confirmedGrossTotal: number;
  confirmedNetTotal: number;
  confirmedPaymentGross: number;
  confirmedRefundGross: number;
  paymentStatus: SalePaymentStatus;
}

export const calculatePaymentEventNetAmount = (input: {
  feeAmount: number;
  grossAmount: number;
  type: PaymentEventType;
}) => {
  if (input.type === "payment") {
    return roundMoney(input.grossAmount - input.feeAmount);
  }

  return roundMoney(input.grossAmount + input.feeAmount);
};

export const getPaymentEventDirection = (type: PaymentEventType) =>
  type === "payment" ? 1 : -1;

export const getSignedPaymentGrossAmount = (event: PaymentEventLike) =>
  roundMoney(
    getPaymentEventDirection(event.type) * toNumber(event.grossAmount)
  );

export const getSignedPaymentNetAmount = (event: PaymentEventLike) =>
  roundMoney(getPaymentEventDirection(event.type) * toNumber(event.netAmount));

export const deriveSalePaymentStatus = (input: {
  confirmedChargebackGross: number;
  confirmedGrossTotal: number;
  confirmedRefundGross: number;
  orderTotal: number;
}): SalePaymentStatus => {
  if (input.confirmedChargebackGross > 0 && input.confirmedGrossTotal <= 0) {
    return "chargeback";
  }

  if (input.confirmedRefundGross > 0 && input.confirmedGrossTotal <= 0) {
    return "refunded";
  }

  if (input.confirmedGrossTotal <= 0) {
    return "unpaid";
  }

  if (input.confirmedChargebackGross > 0) {
    return "chargeback";
  }

  if (input.confirmedGrossTotal < input.orderTotal) {
    return "partially_paid";
  }

  return "paid";
};

export const summarizePaymentLedger = (
  orderTotal: number,
  events: PaymentEventLike[]
): PaymentLedgerSummary => {
  const confirmedEvents = events.filter(
    (event) => event.status === "confirmed"
  );
  const confirmedGrossTotal = roundMoney(
    confirmedEvents.reduce(
      (total, event) => total + getSignedPaymentGrossAmount(event),
      0
    )
  );
  const confirmedNetTotal = roundMoney(
    confirmedEvents.reduce(
      (total, event) => total + getSignedPaymentNetAmount(event),
      0
    )
  );
  const confirmedFeeTotal = roundMoney(
    confirmedEvents.reduce(
      (total, event) => total + toNumber(event.feeAmount),
      0
    )
  );
  const confirmedPaymentGross = roundMoney(
    confirmedEvents
      .filter((event) => event.type === "payment")
      .reduce((total, event) => total + toNumber(event.grossAmount), 0)
  );
  const confirmedRefundGross = roundMoney(
    confirmedEvents
      .filter((event) => event.type === "refund")
      .reduce((total, event) => total + toNumber(event.grossAmount), 0)
  );
  const confirmedChargebackGross = roundMoney(
    confirmedEvents
      .filter((event) => event.type === "chargeback")
      .reduce((total, event) => total + toNumber(event.grossAmount), 0)
  );
  const amountDue = roundMoney(
    Math.max(orderTotal - Math.max(confirmedGrossTotal, 0), 0)
  );

  return {
    amountDue,
    confirmedChargebackGross,
    confirmedFeeTotal,
    confirmedGrossTotal,
    confirmedNetTotal,
    confirmedPaymentGross,
    confirmedRefundGross,
    paymentStatus: deriveSalePaymentStatus({
      confirmedChargebackGross,
      confirmedGrossTotal,
      confirmedRefundGross,
      orderTotal,
    }),
  };
};

export const calculateSaleGrossProfit = (
  orderTotal: number,
  costOfGoodsSold: number
) => roundMoney(orderTotal - costOfGoodsSold);

export const calculateSaleNetProfit = (input: {
  confirmedChargebackGross: number;
  confirmedFeeTotal: number;
  confirmedRefundGross: number;
  costOfGoodsSold: number;
  orderTotal: number;
}) =>
  roundMoney(
    input.orderTotal -
      input.costOfGoodsSold -
      input.confirmedFeeTotal -
      input.confirmedRefundGross -
      input.confirmedChargebackGross
  );
