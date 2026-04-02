import "server-only";

import { and, asc, eq, gt, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  productStockEntries,
  products,
  saleItems,
  sales,
} from "@/db/schema";
import type {
  DashboardMetrics,
  DashboardSelectedRange,
} from "@/features/dashboard/contracts";
import { buildDashboardMetrics } from "@/features/dashboard/metrics";
import { formatDateInputValue } from "@/lib/domain/date";

export const getDashboardDateBounds = async (): Promise<{
  from: string;
  to: string;
}> => {
  const [salesRows, stockEntriesRows] = await Promise.all([
    db
      .select({
        minOccurredOn: sql<string | null>`min(${sales.occurredOn})`,
      })
      .from(sales),
    db
      .select({
        minStockedOn: sql<string | null>`min(${productStockEntries.stockedOn})`,
      })
      .from(productStockEntries),
  ]);
  const salesRow = salesRows[0];
  const stockEntriesRow = stockEntriesRows[0];
  const today = formatDateInputValue();
  const earliestMovementDate = [
    salesRow?.minOccurredOn,
    stockEntriesRow?.minStockedOn,
  ]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))[0];

  return {
    from: earliestMovementDate ?? today,
    to: today,
  };
};

export const getDashboardMetrics = async (
  range: DashboardSelectedRange
): Promise<DashboardMetrics> => {
  const [salesRows, saleItemRows, inventoryRows] = await Promise.all([
    db
      .select({
        feeAmount: sales.feeAmount,
        freightAmount: sales.freightAmount,
        occurredOn: sales.occurredOn,
        status: sales.status,
        totalAmount: sales.totalAmount,
      })
      .from(sales)
      .where(
        and(gte(sales.occurredOn, range.from), lte(sales.occurredOn, range.to))
      ),
    db
      .select({
        imageBlurDataUrl: products.imageBlurDataUrl,
        imageHeight: products.imageHeight,
        imageVersion: products.imageVersion,
        imageWidth: products.imageWidth,
        lineTotal: saleItems.lineTotal,
        occurredOn: sales.occurredOn,
        productId: saleItems.productId,
        productName: saleItems.productNameSnapshot,
        quantity: saleItems.quantity,
        status: sales.status,
        unitCostSnapshot: saleItems.unitCostSnapshot,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(gte(sales.occurredOn, range.from), lte(sales.occurredOn, range.to))
      ),
    db
      .select({
        categoryName: categories.name,
        inventoryValue: sql<string>`coalesce(sum(${products.stock} * ${products.costPrice}), '0')`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(gt(products.stock, 0))
      .groupBy(categories.name)
      .orderBy(asc(categories.name)),
  ]);

  return buildDashboardMetrics({
    inventory: inventoryRows.map((row) => ({
      categoryName: row.categoryName,
      inventoryValue: Number(row.inventoryValue),
    })),
    range,
    saleItems: saleItemRows.map((row) => ({
      imageBlurDataUrl: row.imageBlurDataUrl,
      imageHeight: row.imageHeight,
      imageVersion: row.imageVersion,
      imageWidth: row.imageWidth,
      lineTotal: Number(row.lineTotal),
      occurredOn: row.occurredOn,
      productId: row.productId,
      productName: row.productName,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
      unitCostSnapshot: Number(row.unitCostSnapshot),
    })),
    sales: salesRows.map((row) => ({
      feeAmount: Number(row.feeAmount),
      freightAmount: Number(row.freightAmount),
      occurredOn: row.occurredOn,
      status: row.status as "cancelled" | "completed",
      totalAmount: Number(row.totalAmount),
    })),
  });
};
