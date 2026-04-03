export type SalePaymentMethod = "card" | "pix";
export type SalePaymentFeePayer = "customer" | "not_applicable" | "seller";

export interface SaleProductOption {
  id: string;
  name: string;
  price: string;
  stock: number;
}

export interface SaleListItem {
  additionalAmount: string;
  cancelledAt: Date | null;
  chargedAmount: string;
  customerName: string | null;
  discountAmount: string;
  feeAmount: string;
  freightAmount: string;
  id: string;
  itemCount: number;
  occurredOn: string;
  paymentFeePayer: SalePaymentFeePayer;
  paymentFeePercent: string;
  paymentInstallments: number;
  paymentMethod: SalePaymentMethod;
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
  chargedAmount: string;
  createdAt: Date;
  customerName: string | null;
  discountAmount: string;
  feeAmount: string;
  freightAmount: string;
  id: string;
  items: SaleDetailItem[];
  notes: string | null;
  occurredOn: string;
  paymentFeePayer: SalePaymentFeePayer;
  paymentFeePercent: string;
  paymentInstallments: number;
  paymentMethod: SalePaymentMethod;
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
  paymentMethod: SalePaymentMethod;
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
  topPaymentMethod: SalePaymentMethod | null;
  totalProfit: number;
  totalSold: number;
}
