import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, saleItems, sales } from "@/db/schema";
import type {
  SaleDetail,
  SaleListItem,
  SaleProductOption,
} from "@/features/sales/contracts";
import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/lib/opaque-cursor";

const DEFAULT_PAGE_SIZE = 15;
const saleStatusFilterSchema = z.enum(["all", "cancelled", "completed"]);
const salesCursorSchema = z.object({
  createdAt: z.string().min(1),
  id: z.string().min(1),
  occurredOn: z.string().min(1),
  version: z.literal(1),
});

export type SaleStatusFilter = z.infer<typeof saleStatusFilterSchema>;

interface SalesQueryInput {
  cursor?: string;
  pageSize?: number;
  query?: string;
  status?: SaleStatusFilter;
}

const buildSalesCursor = (row: {
  createdAt: Date;
  id: string;
  occurredOn: string;
}) =>
  encodeOpaqueCursor({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    occurredOn: row.occurredOn,
    version: 1,
  });

const parseSalesCursor = (cursor: string) => {
  const parsedCursor = decodeOpaqueCursor(
    cursor,
    salesCursorSchema,
    "Cursor de vendas invalido."
  );

  return {
    ...parsedCursor,
    createdAt: new Date(parsedCursor.createdAt),
  };
};

export interface PaginatedSalesList {
  items: SaleListItem[];
  nextCursor: string | null;
}

export async function getSalesQuery({
  cursor,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  status = "all",
}: SalesQueryInput = {}): Promise<PaginatedSalesList> {
  const limit = pageSize + 1;
  const parsedCursor = cursor ? parseSalesCursor(cursor) : null;
  const normalizedQuery = query?.trim();
  const searchPattern =
    normalizedQuery && normalizedQuery.length > 0
      ? `%${normalizedQuery}%`
      : null;
  const filters: SQL[] = [];

  if (status !== "all") {
    filters.push(eq(sales.status, status));
  }

  if (searchPattern) {
    const searchFilter = or(
      ilike(sql<string>`${sales.id}::text`, searchPattern),
      ilike(sql<string>`coalesce(${sales.customerName}, '')`, searchPattern)
    );

    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (parsedCursor) {
    const cursorFilter = or(
      lt(sales.occurredOn, parsedCursor.occurredOn),
      and(
        eq(sales.occurredOn, parsedCursor.occurredOn),
        lt(sales.createdAt, parsedCursor.createdAt)
      ),
      and(
        eq(sales.occurredOn, parsedCursor.occurredOn),
        eq(sales.createdAt, parsedCursor.createdAt),
        lt(sales.id, parsedCursor.id)
      )
    );

    if (cursorFilter) {
      filters.push(cursorFilter);
    }
  }

  const rows = await db
    .select({
      additionalAmount: sales.additionalAmount,
      cancelledAt: sales.cancelledAt,
      chargedAmount: sales.chargedAmount,
      createdAt: sales.createdAt,
      customerName: sales.customerName,
      discountAmount: sales.discountAmount,
      feeAmount: sales.feeAmount,
      freightAmount: sales.freightAmount,
      id: sales.id,
      itemCount: sql<number>`(
        select count(*)
        from "sale_items"
        where "sale_items"."sale_id" = "sales"."id"
      )`,
      occurredOn: sales.occurredOn,
      paymentFeePayer: sales.paymentFeePayer,
      paymentFeePercent: sales.paymentFeePercent,
      paymentInstallments: sales.paymentInstallments,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      totalAmount: sales.totalAmount,
    })
    .from(sales)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(sales.occurredOn), desc(sales.createdAt), desc(sales.id))
    .limit(limit);

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const lastItem = items.at(-1);

  return {
    items: items.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount),
      paymentFeePayer: row.paymentFeePayer as SaleListItem["paymentFeePayer"],
      paymentMethod: row.paymentMethod as SaleListItem["paymentMethod"],
      status: row.status as SaleListItem["status"],
    })),
    nextCursor: hasMore && lastItem ? buildSalesCursor(lastItem) : null,
  };
}

export function getSaleProductsQuery(): Promise<SaleProductOption[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stock: products.stock,
    })
    .from(products)
    .where(and(isNull(products.archivedAt), gt(products.stock, 0)))
    .orderBy(asc(products.name), asc(products.createdAt), asc(products.id));
}

export async function getSaleByIdQuery(
  id: string
): Promise<SaleDetail | undefined> {
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, id),
  });

  if (!sale) {
    return;
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
    paymentFeePayer: sale.paymentFeePayer as SaleDetail["paymentFeePayer"],
    paymentMethod: sale.paymentMethod as SaleDetail["paymentMethod"],
    status: sale.status as SaleDetail["status"],
  };
}
