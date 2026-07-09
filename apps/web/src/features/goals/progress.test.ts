import { describe, expect, it } from "vitest";
import type { DashboardMetrics } from "@/features/dashboard/contracts";
import {
  computeGoalProgressPercent,
  getGoalActualValue,
  goalTargetMet,
} from "@/features/goals/progress";

const baseMetrics = (): DashboardMetrics => ({
  inventoryByCategory: [],
  periodComparison: [],
  periodGranularity: "day",
  resultStatus: "profit",
  selectedRange: { from: "2025-01-01", to: "2025-01-31" },
  topProducts: [],
  totalCosts: 100,
  totalProductCosts: 80,
  totalResult: 400,
  totalSalesCount: 12,
  totalShippingAndSellerFees: 20,
  totalSold: 500,
});

describe("getGoalActualValue", () => {
  it("maps metrics to revenue, profit and sales count", () => {
    const m = baseMetrics();
    expect(getGoalActualValue("revenue", m)).toBe(500);
    expect(getGoalActualValue("profit", m)).toBe(400);
    expect(getGoalActualValue("sales_count", m)).toBe(12);
  });
});

describe("goalTargetMet", () => {
  it("compares money metrics with currency rounding", () => {
    expect(goalTargetMet("revenue", 100.001, 100)).toBe(true);
    expect(goalTargetMet("revenue", 99.994, 100)).toBe(false);
    expect(goalTargetMet("profit", -10, 0)).toBe(false);
    expect(goalTargetMet("profit", 0, 0)).toBe(true);
  });

  it("compares sales count with integer rounding", () => {
    expect(goalTargetMet("sales_count", 10.2, 10)).toBe(true);
    expect(goalTargetMet("sales_count", 9.4, 10)).toBe(false);
  });
});

describe("computeGoalProgressPercent", () => {
  it("returns zero when target is not positive", () => {
    expect(computeGoalProgressPercent(10, 0)).toEqual({
      barPercent: 0,
      progressPercent: 0,
    });
  });

  it("caps bar percent at 100 but keeps raw progress", () => {
    expect(computeGoalProgressPercent(150, 100)).toEqual({
      barPercent: 100,
      progressPercent: 150,
    });
  });
});
