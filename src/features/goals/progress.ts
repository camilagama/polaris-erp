import type { DashboardMetrics } from "@/features/dashboard/contracts";
import type { GoalMetric } from "@/features/goals/contracts";
import { roundCurrency } from "@/lib/domain/currency";

export const getGoalActualValue = (
  metric: GoalMetric,
  metrics: DashboardMetrics
): number => {
  switch (metric) {
    case "revenue": {
      return metrics.totalSold;
    }
    case "profit": {
      return metrics.totalResult;
    }
    case "sales_count": {
      return metrics.totalSalesCount;
    }
    default: {
      throw new Error("Metric de meta desconhecido.");
    }
  }
};

export const goalTargetMet = (
  metric: GoalMetric,
  actual: number,
  target: number
): boolean => {
  if (metric === "sales_count") {
    return Math.round(actual) >= Math.round(target);
  }

  return roundCurrency(actual) >= roundCurrency(target);
};

export const computeGoalProgressPercent = (
  actual: number,
  target: number
): { barPercent: number; progressPercent: number } => {
  if (target <= 0) {
    return { barPercent: 0, progressPercent: 0 };
  }

  const progressPercent = (actual / target) * 100;
  const barPercent = Math.min(100, Math.max(0, progressPercent));

  return { barPercent, progressPercent };
};
