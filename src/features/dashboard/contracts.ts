export type DashboardPeriodGranularity = "day" | "month";
export type DashboardResultStatus = "breakEven" | "loss" | "profit";

export interface DashboardSelectedRange {
  from: string;
  to: string;
}

export interface DashboardPeriodComparisonPoint {
  costs: number;
  label: string;
  result: number;
  salesCount: number;
  sold: number;
}

export interface DashboardTopProduct {
  id: string;
  imageBlurDataUrl: string | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageWidth: number | null;
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
  periodComparison: DashboardPeriodComparisonPoint[];
  periodGranularity: DashboardPeriodGranularity;
  resultStatus: DashboardResultStatus;
  selectedRange: DashboardSelectedRange;
  topProducts: DashboardTopProduct[];
  totalCosts: number;
  totalProductCosts: number;
  totalResult: number;
  totalSalesCount: number;
  totalShippingAndSellerFees: number;
  totalSold: number;
}
