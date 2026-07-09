import { describe, expect, it } from "vitest";
import { buildSalesAnalytics } from "@/features/sales/analytics";

describe("buildSalesAnalytics", () => {
  it("calculates sold amount, profit, tickets and payment mix", () => {
    const analytics = buildSalesAnalytics({
      range: {
        from: "2026-04-01",
        to: "2026-04-30",
      },
      saleItems: [
        {
          occurredOn: "2026-04-10",
          quantity: 2,
          status: "completed",
          unitCostSnapshot: 30,
        },
        {
          occurredOn: "2026-04-11",
          quantity: 1,
          status: "cancelled",
          unitCostSnapshot: 10,
        },
      ],
      sales: [
        {
          feeAmount: 5,
          freightAmount: 10,
          occurredOn: "2026-04-10",
          paymentMethod: "pix",
          status: "completed",
          totalAmount: 150,
        },
        {
          feeAmount: 2,
          freightAmount: 8,
          occurredOn: "2026-04-11",
          paymentMethod: "card",
          status: "cancelled",
          totalAmount: 90,
        },
      ],
    });

    expect(analytics.totalSold).toBe(150);
    expect(analytics.totalProfit).toBe(75);
    expect(analytics.averageTicket).toBe(150);
    expect(analytics.completedSalesCount).toBe(1);
    expect(analytics.cancelledSalesCount).toBe(1);
    expect(analytics.topPaymentMethod).toBe("pix");
    expect(analytics.paymentMethods).toEqual([
      {
        paymentMethod: "pix",
        salesCount: 1,
        totalAmount: 150,
      },
    ]);
  });

  it("uses monthly buckets for longer periods", () => {
    const analytics = buildSalesAnalytics({
      range: {
        from: "2026-01-01",
        to: "2026-04-30",
      },
      saleItems: [
        {
          occurredOn: "2026-02-05",
          quantity: 1,
          status: "completed",
          unitCostSnapshot: 40,
        },
        {
          occurredOn: "2026-04-10",
          quantity: 2,
          status: "completed",
          unitCostSnapshot: 20,
        },
      ],
      sales: [
        {
          feeAmount: 0,
          freightAmount: 10,
          occurredOn: "2026-02-05",
          paymentMethod: "pix",
          status: "completed",
          totalAmount: 100,
        },
        {
          feeAmount: 5,
          freightAmount: 15,
          occurredOn: "2026-04-10",
          paymentMethod: "card",
          status: "completed",
          totalAmount: 200,
        },
      ],
    });

    expect(analytics.periodGranularity).toBe("month");
    expect(analytics.performance).toEqual([
      { label: "jan/26", profit: 0, sold: 0 },
      { label: "fev/26", profit: 50, sold: 100 },
      { label: "mar/26", profit: 0, sold: 0 },
      { label: "abr/26", profit: 140, sold: 200 },
    ]);
  });

  it("does not inflate revenue when the card fee is paid by the customer", () => {
    const analytics = buildSalesAnalytics({
      range: {
        from: "2026-04-01",
        to: "2026-04-30",
      },
      saleItems: [
        {
          occurredOn: "2026-04-15",
          quantity: 1,
          status: "completed",
          unitCostSnapshot: 40,
        },
      ],
      sales: [
        {
          feeAmount: 0,
          freightAmount: 0,
          occurredOn: "2026-04-15",
          paymentMethod: "card",
          status: "completed",
          totalAmount: 100,
        },
      ],
    });

    expect(analytics.totalSold).toBe(100);
    expect(analytics.totalProfit).toBe(60);
    expect(analytics.paymentMethods).toEqual([
      {
        paymentMethod: "card",
        salesCount: 1,
        totalAmount: 100,
      },
    ]);
  });
});
