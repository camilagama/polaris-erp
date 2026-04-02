export interface SaleListItem {
  additionalAmount: string;
  cancelledAt: Date | null;
  customerName: string | null;
  discountAmount: string;
  freightAmount: string;
  id: string;
  itemCount: number;
  occurredOn: string;
  paymentMethod: "card" | "pix";
  status: "cancelled" | "completed";
  totalAmount: string;
}

export interface SaleDetailItem {
  createdAt: Date;
  id: string;
  lineTotal: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitCostSnapshot: string;
  unitPriceSnapshot: string;
}

export interface SaleDetail {
  additionalAmount: string;
  cancelledAt: Date | null;
  createdAt: Date;
  customerName: string | null;
  discountAmount: string;
  freightAmount: string;
  id: string;
  items: SaleDetailItem[];
  notes: string | null;
  occurredOn: string;
  paymentMethod: "card" | "pix";
  status: "cancelled" | "completed";
  totalAmount: string;
}

export type SalesPeriodGranularity = "day" | "month";

export interface SalesPerformancePoint {
  label: string;
  profit: number;
  sold: number;
}

export interface SalesPaymentMethodSummary {
  paymentMethod: "card" | "pix";
  salesCount: number;
  totalAmount: number;
}

export interface SalesStatusSummary {
  count: number;
  status: "cancelled" | "completed";
}

export interface SalesAnalytics {
  averageTicket: number;
  cancelledSalesCount: number;
  completedSalesCount: number;
  paymentMethods: SalesPaymentMethodSummary[];
  performance: SalesPerformancePoint[];
  periodGranularity: SalesPeriodGranularity;
  profitMarginPercent: number;
  statusSummary: SalesStatusSummary[];
  topPaymentMethod: "card" | "pix" | null;
  totalProfit: number;
  totalSold: number;
}
