import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { saleItems, sales } from "@/db/schema";
import { buildSalesAnalytics } from "@/features/sales/analytics";
import type { SalesAnalytics } from "@/features/sales/contracts";
import { formatDateInputValue } from "@/lib/domain/date";

export const getSalesDateBounds = async (): Promise<{
  from: string;
  to: string;
}> => {
  const [row] = await db
    .select({
      maxOccurredOn: sql<string | null>`max(${sales.occurredOn})`,
      minOccurredOn: sql<string | null>`min(${sales.occurredOn})`,
    })
    .from(sales);
  const today = formatDateInputValue();

  return {
    from: row?.minOccurredOn ?? today,
    to: row?.maxOccurredOn ?? today,
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
