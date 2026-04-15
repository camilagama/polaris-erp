import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { productStockEntries, saleItems, sales } from "@/db/schema";
import { buildSalesAnalytics } from "@/features/sales/analytics";
import type { SalesAnalytics } from "@/features/sales/contracts";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { formatDateInputValue } from "@/lib/domain/date";

export const getSalesDateBounds = async (): Promise<{
  from: string;
  to: string;
}> => {
  "use cache: remote";
  cacheTag(CACHE_TAGS.analyticsShared);
  cacheLife("minutes");

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

export const getSalesAnalytics = async (range: {
  from: string;
  to: string;
}): Promise<SalesAnalytics> => {
  const [salesRows, saleItemRows] = await Promise.all([
    db
      .select({
        feeAmount: sales.feeAmount,
        freightAmount: sales.freightAmount,
        occurredOn: sales.occurredOn,
        paymentMethod: sales.paymentMethod,
        status: sales.status,
        totalAmount: sales.totalAmount,
      })
      .from(sales)
      .where(
        sql`${sales.occurredOn} >= ${range.from} and ${sales.occurredOn} <= ${range.to}`
      )
      .orderBy(asc(sales.occurredOn)),
    db
      .select({
        occurredOn: sales.occurredOn,
        quantity: saleItems.quantity,
        status: sales.status,
        unitCostSnapshot: saleItems.unitCostSnapshot,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        sql`${sales.occurredOn} >= ${range.from} and ${sales.occurredOn} <= ${range.to}`
      )
      .orderBy(asc(sales.occurredOn), asc(saleItems.createdAt)),
  ]);

  return buildSalesAnalytics({
    range,
    saleItems: saleItemRows.map((row) => ({
      occurredOn: row.occurredOn,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
      unitCostSnapshot: Number(row.unitCostSnapshot),
    })),
    sales: salesRows.map((row) => ({
      feeAmount: Number(row.feeAmount),
      freightAmount: Number(row.freightAmount),
      occurredOn: row.occurredOn,
      paymentMethod: row.paymentMethod as "card" | "pix",
      status: row.status as "cancelled" | "completed",
      totalAmount: Number(row.totalAmount),
    })),
  });
};
