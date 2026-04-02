export type DashboardResultStatus = "breakEven" | "loss" | "profit";

export interface DashboardMonthlyComparisonPoint {
  monthKey: string;
  monthLabel: string;
  result: number;
  revenue: number;
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

export interface DashboardRestockAlert {
  id: string;
  name: string;
  severity: "critical" | "low";
  stock: number;
}

export interface DashboardMetrics {
  criticalStockCount: number;
  inventoryByCategory: DashboardInventoryCategory[];
  monthlyComparison: DashboardMonthlyComparisonPoint[];
  monthlyRestockInvestment: number;
  monthlyResult: number;
  monthlyRevenue: number;
  referenceMonthKey: string;
  referenceMonthLabel: string;
  restockAlerts: DashboardRestockAlert[];
  resultStatus: DashboardResultStatus;
  topProducts: DashboardTopProduct[];
}
