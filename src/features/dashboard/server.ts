import "server-only";

import { and, asc, eq, gt, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  productStockEntries,
  products,
  saleItems,
  sales,
} from "@/db/schema";
import {
  buildDashboardMetrics,
  getDashboardDateRange,
} from "@/features/dashboard/metrics";
import type { DashboardMetrics } from "./contracts";

export const getDashboardMetrics = async (
  referenceDate = new Date()
): Promise<DashboardMetrics> => {
  const { comparisonStart, currentMonthStart, nextMonthStart } =
    getDashboardDateRange(referenceDate);

  const [salesRows, saleItemRows, stockEntryRows, inventoryRows, productRows] =
    await Promise.all([
      db
        .select({
          occurredOn: sales.occurredOn,
          status: sales.status,
          totalAmount: sales.totalAmount,
        })
        .from(sales)
        .where(
          and(
            gte(sales.occurredOn, comparisonStart),
            lt(sales.occurredOn, nextMonthStart)
          )
        ),
      db
        .select({
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
        .where(
          and(
            gte(sales.occurredOn, comparisonStart),
            lt(sales.occurredOn, nextMonthStart)
          )
        ),
      db
        .select({
          quantity: productStockEntries.quantity,
          stockedOn: productStockEntries.stockedOn,
          unitCost: productStockEntries.unitCost,
        })
        .from(productStockEntries)
        .where(
          and(
            gte(productStockEntries.stockedOn, currentMonthStart),
            lt(productStockEntries.stockedOn, nextMonthStart)
          )
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
      db
        .select({
          archivedAt: products.archivedAt,
          id: products.id,
          name: products.name,
          stock: products.stock,
        })
        .from(products)
        .orderBy(asc(products.name)),
    ]);

  return buildDashboardMetrics({
    inventory: inventoryRows.map((row) => ({
      categoryName: row.categoryName,
      inventoryValue: Number(row.inventoryValue),
    })),
    products: productRows.map((row) => ({
      archivedAt: row.archivedAt,
      id: row.id,
      name: row.name,
      stock: Number(row.stock),
    })),
    referenceDate,
    saleItems: saleItemRows.map((row) => ({
      lineTotal: Number(row.lineTotal),
      occurredOn: row.occurredOn,
      productId: row.productId,
      productName: row.productName,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
      unitCostSnapshot: Number(row.unitCostSnapshot),
    })),
    sales: salesRows.map((row) => ({
      occurredOn: row.occurredOn,
      status: row.status as "cancelled" | "completed",
      totalAmount: Number(row.totalAmount),
    })),
    stockEntries: stockEntryRows.map((row) => ({
      quantity: Number(row.quantity),
      stockedOn: row.stockedOn,
      unitCost: Number(row.unitCost),
    })),
  });
};
