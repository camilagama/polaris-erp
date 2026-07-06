export type ProductStatusFilter = "active" | "archived";

export interface ProductImageAsset {
  blurDataURL: string;
  detailUrl: string;
  height: number;
  tableUrl: string;
  version: number;
  width: number;
}

export interface ProductListItem {
  archivedAt: Date | null;
  categoryId: string;
  categoryName: string;
  costPrice: string;
  createdAt: Date;
  description: string | null;
  id: string;
  image: ProductImageAsset | null;
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

export interface ProductPriceChangeItem {
  changedByUserName: string | null;
  createdAt: Date;
  id: string;
  nextPrice: string;
  previousPrice: string;
}

export interface ProductInventoryCategory {
  categoryName: string;
  inventoryValue: number;
}

export interface ProductCatalogPerformancePoint {
  label: string;
  purchaseAmount: number;
  soldAmount: number;
}

export interface ProductSalesPoint {
  label: string;
  quantitySold: number;
}

export interface ProductAnalytics {
  inventoryByCategory: ProductInventoryCategory[];
  recentPerformance: ProductCatalogPerformancePoint[];
  totalActiveProductsInStock: number;
  totalInventoryInvestment: number;
  totalUnitsInStock: number;
}

export interface ProductSalesHistoryMetrics {
  totalQuantitySold: number;
  totalSoldAmount: number;
  trend: ProductSalesPoint[];
}
