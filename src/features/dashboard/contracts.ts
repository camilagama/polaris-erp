export type DashboardResultStatus = "breakEven" | "loss" | "profit";

export interface DashboardMonthlyComparisonPoint {
  costs: number;
  monthKey: string;
  monthLabel: string;
  result: number;
  sold: number;
}

export interface DashboardTopProduct {
  id: string;
  name: string;
  quantitySold: number;
  soldAmount: number;
}

export interface DashboardInventoryCategory {
  categoryName: string;
  inventoryValue: number;
}

export interface DashboardMetrics {
  inventoryByCategory: DashboardInventoryCategory[];
  monthlyComparison: DashboardMonthlyComparisonPoint[];
  monthlyCosts: number;
  monthlyResult: number;
  monthlySalesCount: number;
  monthlySold: number;
  referenceMonthKey: string;
  referenceMonthLabel: string;
  resultStatus: DashboardResultStatus;
  topProducts: DashboardTopProduct[];
}
