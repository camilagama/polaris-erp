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
