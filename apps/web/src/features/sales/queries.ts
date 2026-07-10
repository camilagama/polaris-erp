import "server-only";

import { products, saleItems, sales } from "@polaris/db/schema";
import { withTenantContext } from "@polaris/db/tenant-context";
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
import type {
  SaleDetail,
  SaleListItem,
  SaleProductOption,
  SaleStatusFilter,
} from "@/features/sales/contracts";
import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/lib/opaque-cursor";

const DEFAULT_PAGE_SIZE = 15;
const DEFAULT_PRODUCT_OPTIONS_PAGE_SIZE = 20;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const saleProductOptionsCursorSchema = z.object({
  createdAt: z.string().min(1),
  id: z.string().min(1),
  name: z.string(),
  version: z.literal(1),
});
const salesCursorSchema = z.object({
  createdAt: z.string().min(1),
  id: z.string().min(1),
  occurredOn: z.string().min(1),
  version: z.literal(1),
});

interface SalesQueryInput {
  cursor?: string;
  organizationId: string;
  pageSize?: number;
  query?: string;
  status?: SaleStatusFilter;
}

interface SaleProductOptionsQueryInput {
  cursor?: string;
  organizationId: string;
  pageSize?: number;
  query?: string;
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

const buildSaleProductOptionsCursor = (row: {
  createdAt: Date;
  id: string;
  name: string;
}) =>
  encodeOpaqueCursor({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    name: row.name,
    version: 1,
  });

const parseSaleProductOptionsCursor = (cursor: string) => {
  const parsedCursor = decodeOpaqueCursor(
    cursor,
    saleProductOptionsCursorSchema,
    "Cursor de produtos da venda invalido."
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

export interface PaginatedSaleProductOptions {
  items: SaleProductOption[];
  nextCursor: string | null;
}

export async function getSalesQuery({
  cursor,
  organizationId,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  status = "all",
}: SalesQueryInput): Promise<PaginatedSalesList> {
  const limit = pageSize + 1;
  const parsedCursor = cursor ? parseSalesCursor(cursor) : null;
  const normalizedQuery = query?.trim() ?? "";
  const searchPattern =
    normalizedQuery.length > 0 ? `%${normalizedQuery}%` : null;
  const filters: SQL[] = [eq(sales.organizationId, organizationId)];

  if (status !== "all") {
    filters.push(eq(sales.status, status));
  }

  if (searchPattern) {
    const searchFilter = UUID_PATTERN.test(normalizedQuery)
      ? or(
          eq(sales.id, normalizedQuery),
          ilike(sales.customerName, searchPattern)
        )
      : ilike(sales.customerName, searchPattern);

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

  const rows = await withTenantContext(organizationId, (tx) =>
    tx
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
            and "sale_items"."organization_id" = ${organizationId}
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
      .limit(limit)
  );

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

export async function getSaleProductsQuery({
  cursor,
  organizationId,
  pageSize = DEFAULT_PRODUCT_OPTIONS_PAGE_SIZE,
  query,
}: SaleProductOptionsQueryInput): Promise<PaginatedSaleProductOptions> {
  const limit = pageSize + 1;
  const parsedCursor = cursor ? parseSaleProductOptionsCursor(cursor) : null;
  const normalizedQuery = query?.trim() ?? "";
  const searchPattern =
    normalizedQuery.length > 0 ? `%${normalizedQuery}%` : null;
  const filters: SQL[] = [
    eq(products.organizationId, organizationId),
    isNull(products.archivedAt),
    gt(products.stock, 0),
  ];

  if (searchPattern) {
    filters.push(ilike(products.name, searchPattern));
  }

  if (parsedCursor) {
    const cursorFilter = or(
      gt(products.name, parsedCursor.name),
      and(
        eq(products.name, parsedCursor.name),
        gt(products.createdAt, parsedCursor.createdAt)
      ),
      and(
        eq(products.name, parsedCursor.name),
        eq(products.createdAt, parsedCursor.createdAt),
        gt(products.id, parsedCursor.id)
      )
    );

    if (cursorFilter) {
      filters.push(cursorFilter);
    }
  }

  const rows = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        createdAt: products.createdAt,
        id: products.id,
        name: products.name,
        price: products.price,
        stock: products.stock,
      })
      .from(products)
      .where(and(...filters))
      .orderBy(asc(products.name), asc(products.createdAt), asc(products.id))
      .limit(limit)
  );

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const lastItem = items.at(-1);

  return {
    items: items.map(({ createdAt: _createdAt, ...item }) => item),
    nextCursor:
      hasMore && lastItem ? buildSaleProductOptionsCursor(lastItem) : null,
  };
}

export async function getSaleByIdQuery(
  organizationId: string,
  id: string
): Promise<SaleDetail | undefined> {
  const [sale, items] = await withTenantContext(organizationId, async (tx) => {
    const saleResult = await tx.query.sales.findFirst({
      where: and(eq(sales.id, id), eq(sales.organizationId, organizationId)),
    });

    if (!saleResult) {
      return [undefined, []] as const;
    }

    const itemRows = await tx
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
      .where(
        and(
          eq(saleItems.organizationId, organizationId),
          eq(saleItems.saleId, id)
        )
      )
      .orderBy(asc(saleItems.createdAt));

    return [saleResult, itemRows] as const;
  });

  if (!sale) {
    return;
  }

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
