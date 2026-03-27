import { describe, expect, it } from "vitest";
import {
  calculatePaymentEventNetAmount,
  calculateSaleGrossProfit,
  calculateSaleNetProfit,
  summarizePaymentLedger,
} from "@/lib/domain/payment-ledger";

describe("payment ledger", () => {
  it("computes payment and refund net amounts with opposite cash effects", () => {
    expect(
      calculatePaymentEventNetAmount({
        feeAmount: 5,
        grossAmount: 100,
        type: "payment",
      })
    ).toBe(95);

    expect(
      calculatePaymentEventNetAmount({
        feeAmount: 5,
        grossAmount: 100,
        type: "refund",
      })
    ).toBe(105);
  });

  it("summarizes split payments and keeps the right amount due", () => {
    const summary = summarizePaymentLedger(200, [
      {
        grossAmount: 120,
        netAmount: 120,
        status: "confirmed",
        type: "payment",
      },
      {
        grossAmount: 30,
        netAmount: 28.5,
        status: "confirmed",
        type: "payment",
      },
      {
        grossAmount: 50,
        netAmount: 50,
        status: "pending",
        type: "payment",
      },
    ]);

    expect(summary.confirmedGrossTotal).toBe(150);
    expect(summary.confirmedNetTotal).toBe(148.5);
    expect(summary.amountDue).toBe(50);
    expect(summary.paymentStatus).toBe("partially_paid");
  });

  it("treats refund and chargeback as negative gross effects", () => {
    const summary = summarizePaymentLedger(200, [
      {
        grossAmount: 200,
        netAmount: 190,
        status: "confirmed",
        type: "payment",
      },
      {
        grossAmount: 200,
        netAmount: 205,
        status: "confirmed",
        type: "chargeback",
      },
    ]);

    expect(summary.confirmedGrossTotal).toBe(0);
    expect(summary.confirmedNetTotal).toBe(-15);
    expect(summary.paymentStatus).toBe("chargeback");
  });

  it("separates gross and net profit from financial events", () => {
    expect(calculateSaleGrossProfit(240, 100)).toBe(140);
    expect(
      calculateSaleNetProfit({
        confirmedChargebackGross: 0,
        confirmedFeeTotal: 12,
        confirmedRefundGross: 20,
        costOfGoodsSold: 100,
        orderTotal: 240,
      })
    ).toBe(108);
  });
});
