import { asc, count, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { saleItems, sales } from "@/db/schema";
import type { SaleDetail, SaleListItem } from "@/features/sales/contracts";

const DEFAULT_PAGE_SIZE = 50;

export interface PaginatedSalesList {
  items: SaleListItem[];
  nextCursor: string | null;
}

export async function getSalesQuery(
  cursor?: string,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedSalesList> {
  const limit = pageSize + 1;

  const baseQuery = db
    .select({
      additionalAmount: sales.additionalAmount,
      cancelledAt: sales.cancelledAt,
      createdAt: sales.createdAt,
      customerName: sales.customerName,
      discountAmount: sales.discountAmount,
      freightAmount: sales.freightAmount,
      id: sales.id,
      itemCount: count(saleItems.id),
      occurredOn: sales.occurredOn,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      totalAmount: sales.totalAmount,
    })
    .from(sales)
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .groupBy(sales.id)
    .orderBy(desc(sales.occurredOn), desc(sales.createdAt))
    .limit(limit);

  if (cursor) {
    baseQuery.where(lt(sales.createdAt, new Date(cursor)));
  }

  const rows = await baseQuery;
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;

  return {
    items: items.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount),
      paymentMethod: row.paymentMethod as SaleListItem["paymentMethod"],
      status: row.status as SaleListItem["status"],
    })),
    nextCursor: hasMore
      ? (items.at(-1)?.createdAt.toISOString() ?? null)
      : null,
  };
}

export async function getSaleByIdQuery(
  id: string
): Promise<SaleDetail | undefined> {
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, id),
  });

  if (!sale) {
    return undefined;
  }

  const items = await db
    .select({
      createdAt: saleItems.createdAt,
      id: saleItems.id,
      lineTotal: saleItems.lineTotal,
      productId: saleItems.productId,
      productNameSnapshot: saleItems.productNameSnapshot,
      quantity: saleItems.quantity,
      unitCostSnapshot: saleItems.unitCostSnapshot,
      unitPriceSnapshot: saleItems.unitPriceSnapshot,
    })
    .from(saleItems)
    .where(eq(saleItems.saleId, id))
    .orderBy(asc(saleItems.createdAt));

  return {
    ...sale,
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    })),
    paymentMethod: sale.paymentMethod as SaleDetail["paymentMethod"],
    status: sale.status as SaleDetail["status"],
  };
}
