export interface ProductListItem {
  archivedAt: Date | null;
  categoryId: string;
  categoryName: string;
  costPrice: string;
  description: string | null;
  id: string;
  name: string;
  price: string;
  purchasedOn: string;
  stock: number;
}

export interface ProductStockEntryItem {
  createdAt: Date;
  id: string;
  productId: string;
  quantity: number;
  stockedOn: string;
  unitCost: string;
}

export interface ProductStockWriteOffItem {
  createdAt: Date;
  happenedOn: string;
  id: string;
  notes: string | null;
  productId: string;
  quantity: number;
  reason: "adjustment" | "operational";
  unitCostSnapshot: string;
}

export interface ProductSaleHistoryItem {
  cancelledAt: Date | null;
  createdAt: Date;
  id: string;
  lineTotal: string;
  occurredOn: string;
  quantity: number;
  saleId: string;
  status: "cancelled" | "completed";
  unitCostSnapshot: string;
}

export interface ProductInventoryCategory {
  categoryName: string;
  inventoryValue: number;
}

export interface ProductSalesPoint {
  label: string;
  quantitySold: number;
  soldAmount: number;
}

export interface ProductAnalytics {
  inventoryByCategory: ProductInventoryCategory[];
  recentSales: ProductSalesPoint[];
  totalActiveProductsInStock: number;
  totalInventoryInvestment: number;
  totalUnitsInStock: number;
  totalZeroStockProducts: number;
}

export interface ProductSalesHistoryMetrics {
  totalQuantitySold: number;
  totalSoldAmount: number;
  trend: ProductSalesPoint[];
}
