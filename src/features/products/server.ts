import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, saleItems, sales } from "@/db/schema";
import {
  buildProductAnalytics,
  buildProductSalesHistoryMetrics,
} from "@/features/products/analytics";
import type {
  ProductAnalytics,
  ProductSalesHistoryMetrics,
} from "@/features/products/contracts";
import { formatDateInputValue } from "@/lib/domain/date";

export const getProductAnalytics = async ({
  today = formatDateInputValue(),
}: {
  today?: string;
} = {}): Promise<ProductAnalytics> => {
  const recentFromDate = new Date(`${today}T00:00:00`);
  recentFromDate.setDate(recentFromDate.getDate() - 29);
  const recentFrom = formatDateInputValue(recentFromDate);
  const [inventoryRows, recentSalesRows] = await Promise.all([
    db
      .select({
        archivedAt: products.archivedAt,
        categoryName: categories.name,
        costPrice: products.costPrice,
        stock: products.stock,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(asc(products.name)),
    db
      .select({
        lineTotal: saleItems.lineTotal,
        occurredOn: sales.occurredOn,
        quantity: saleItems.quantity,
        status: sales.status,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(gte(sales.occurredOn, recentFrom), lte(sales.occurredOn, today))
      ),
  ]);

  return buildProductAnalytics({
    inventory: inventoryRows.map((row) => ({
      archivedAt: row.archivedAt,
      categoryName: row.categoryName,
      costPrice: Number(row.costPrice),
      stock: row.stock,
    })),
    sales: recentSalesRows.map((row) => ({
      lineTotal: Number(row.lineTotal),
      occurredOn: row.occurredOn,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
    })),
    today,
  });
};

export const getProductSalesHistoryMetrics = async (
  productId: string
): Promise<ProductSalesHistoryMetrics> => {
  const salesRows = await db
    .select({
      lineTotal: saleItems.lineTotal,
      occurredOn: sales.occurredOn,
      quantity: saleItems.quantity,
      status: sales.status,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(eq(saleItems.productId, productId))
    .orderBy(asc(sales.occurredOn), asc(saleItems.createdAt));

  return buildProductSalesHistoryMetrics({
    sales: salesRows.map((row) => ({
      lineTotal: Number(row.lineTotal),
      occurredOn: row.occurredOn,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
    })),
  });
};
