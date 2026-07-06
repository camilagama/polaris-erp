import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  isNotNull,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  categories,
  productPriceChanges,
  productStockEntries,
  productStockWriteOffs,
  products,
  saleItems,
  sales,
  users,
} from "@/db/schema";
import type {
  ProductListItem,
  ProductPriceChangeItem,
  ProductSaleHistoryItem,
  ProductStatusFilter,
  ProductStockEntryItem,
  ProductStockWriteOffItem,
} from "@/features/products/contracts";
import { buildProductImageUrl } from "@/features/products/image-urls";
import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/lib/opaque-cursor";

const DEFAULT_PAGE_SIZE = 15;
const productCursorSchema = z.object({
  createdAt: z.string().min(1),
  id: z.string().min(1),
  name: z.string(),
  version: z.literal(1),
});

interface ProductsQueryInput {
  cursor?: string;
  organizationId: string;
  pageSize?: number;
  query?: string;
  status?: ProductStatusFilter;
}

const mapProductImage = (row: {
  id: string;
  imageBlurDataUrl: string | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageWidth: number | null;
  organizationId: string;
}) => {
  if (
    row.imageVersion === null ||
    row.imageWidth === null ||
    row.imageHeight === null ||
    row.imageBlurDataUrl === null
  ) {
    return null;
  }

  return {
    blurDataURL: row.imageBlurDataUrl,
    detailUrl: buildProductImageUrl(
      row.organizationId,
      row.id,
      row.imageVersion,
      "detail"
    ),
    height: row.imageHeight,
    tableUrl: buildProductImageUrl(
      row.organizationId,
      row.id,
      row.imageVersion,
      "table"
    ),
    version: row.imageVersion,
    width: row.imageWidth,
  };
};

const mapProductListItem = (row: {
  archivedAt: Date | null;
  categoryId: string;
  categoryName: string;
  costPrice: string;
  createdAt: Date;
  description: string | null;
  id: string;
  imageBlurDataUrl: string | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageWidth: number | null;
  name: string;
  organizationId: string;
  price: string;
  purchasedOn: string;
  stock: number;
}): ProductListItem => ({
  archivedAt: row.archivedAt,
  categoryId: row.categoryId,
  categoryName: row.categoryName,
  costPrice: row.costPrice,
  createdAt: row.createdAt,
  description: row.description,
  id: row.id,
  image: mapProductImage(row),
  name: row.name,
  price: row.price,
  purchasedOn: row.purchasedOn,
  stock: row.stock,
});

const buildProductsCursor = (row: {
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

const parseProductsCursor = (cursor: string) => {
  const parsedCursor = decodeOpaqueCursor(
    cursor,
    productCursorSchema,
    "Cursor de produtos invalido."
  );

  return {
    ...parsedCursor,
    createdAt: new Date(parsedCursor.createdAt),
  };
};

export interface PaginatedProductsList {
  items: ProductListItem[];
  nextCursor: string | null;
}

export async function getProductsQuery({
  cursor,
  organizationId,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  status = "active",
}: ProductsQueryInput): Promise<PaginatedProductsList> {
  const limit = pageSize + 1;
  const parsedCursor = cursor ? parseProductsCursor(cursor) : null;
  const normalizedQuery = query?.trim();
  const searchPattern =
    normalizedQuery && normalizedQuery.length > 0
      ? `%${normalizedQuery}%`
      : null;
  const filters: SQL[] = [
    eq(products.organizationId, organizationId),
    status === "archived"
      ? isNotNull(products.archivedAt)
      : isNull(products.archivedAt),
  ];

  if (searchPattern) {
    const searchFilter = or(
      ilike(products.name, searchPattern),
      ilike(categories.name, searchPattern)
    );

    if (searchFilter) {
      filters.push(searchFilter);
    }
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

  const rows = await db
    .select({
      archivedAt: products.archivedAt,
      categoryId: products.categoryId,
      categoryName: categories.name,
      costPrice: products.costPrice,
      createdAt: products.createdAt,
      description: products.description,
      id: products.id,
      imageBlurDataUrl: products.imageBlurDataUrl,
      imageHeight: products.imageHeight,
      imageVersion: products.imageVersion,
      imageWidth: products.imageWidth,
      name: products.name,
      organizationId: products.organizationId,
      price: products.price,
      purchasedOn: products.purchasedOn,
      stock: products.stock,
    })
    .from(products)
    .innerJoin(
      categories,
      and(
        eq(products.categoryId, categories.id),
        eq(categories.organizationId, organizationId)
      )
    )
    .where(and(...filters))
    .orderBy(asc(products.name), asc(products.createdAt), asc(products.id))
    .limit(limit);

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const lastItem = items.at(-1);

  return {
    items: items.map(mapProductListItem),
    nextCursor: hasMore && lastItem ? buildProductsCursor(lastItem) : null,
  };
}

export async function getProductByIdQuery(
  organizationId: string,
  id: string
): Promise<ProductListItem | undefined> {
  const row = await db
    .select({
      archivedAt: products.archivedAt,
      categoryId: products.categoryId,
      categoryName: categories.name,
      costPrice: products.costPrice,
      createdAt: products.createdAt,
      description: products.description,
      id: products.id,
      imageBlurDataUrl: products.imageBlurDataUrl,
      imageHeight: products.imageHeight,
      imageVersion: products.imageVersion,
      imageWidth: products.imageWidth,
      name: products.name,
      organizationId: products.organizationId,
      price: products.price,
      purchasedOn: products.purchasedOn,
      stock: products.stock,
    })
    .from(products)
    .innerJoin(
      categories,
      and(
        eq(products.categoryId, categories.id),
        eq(categories.organizationId, organizationId)
      )
    )
    .where(
      and(eq(products.id, id), eq(products.organizationId, organizationId))
    )
    .then((rows) => rows[0]);

  if (!row) {
    return;
  }

  return mapProductListItem(row);
}

export async function getProductStockEntriesByProductIdQuery(
  organizationId: string,
  productId: string
): Promise<ProductStockEntryItem[]> {
  const entries = await db
    .select({
      createdAt: productStockEntries.createdAt,
      id: productStockEntries.id,
      productId: productStockEntries.productId,
      quantity: productStockEntries.quantity,
      stockedOn: productStockEntries.stockedOn,
      unitCost: productStockEntries.unitCost,
    })
    .from(productStockEntries)
    .where(
      and(
        eq(productStockEntries.organizationId, organizationId),
        eq(productStockEntries.productId, productId)
      )
    )
    .orderBy(
      desc(productStockEntries.stockedOn),
      desc(productStockEntries.createdAt)
    )
    .limit(200);

  return entries.map((entry) => ({
    ...entry,
    quantity: Number(entry.quantity),
  }));
}

export async function getProductStockWriteOffsByProductIdQuery(
  organizationId: string,
  productId: string
): Promise<ProductStockWriteOffItem[]> {
  const writeOffs = await db
    .select({
      createdAt: productStockWriteOffs.createdAt,
      happenedOn: productStockWriteOffs.happenedOn,
      id: productStockWriteOffs.id,
      notes: productStockWriteOffs.notes,
      productId: productStockWriteOffs.productId,
      quantity: productStockWriteOffs.quantity,
      reason: productStockWriteOffs.reason,
      unitCostSnapshot: productStockWriteOffs.unitCostSnapshot,
    })
    .from(productStockWriteOffs)
    .where(
      and(
        eq(productStockWriteOffs.organizationId, organizationId),
        eq(productStockWriteOffs.productId, productId)
      )
    )
    .orderBy(
      desc(productStockWriteOffs.happenedOn),
      desc(productStockWriteOffs.createdAt)
    )
    .limit(200);

  return writeOffs.map((writeOff) => ({
    ...writeOff,
    quantity: Number(writeOff.quantity),
    reason: writeOff.reason as ProductStockWriteOffItem["reason"],
  }));
}

export async function getProductSalesByProductIdQuery(
  organizationId: string,
  productId: string
): Promise<ProductSaleHistoryItem[]> {
  const rows = await db
    .select({
      cancelledAt: sales.cancelledAt,
      createdAt: saleItems.createdAt,
      id: saleItems.id,
      lineTotal: saleItems.lineTotal,
      occurredOn: sales.occurredOn,
      quantity: saleItems.quantity,
      saleId: sales.id,
      status: sales.status,
      unitCostSnapshot: saleItems.unitCostSnapshot,
    })
    .from(saleItems)
    .innerJoin(
      sales,
      and(
        eq(saleItems.saleId, sales.id),
        eq(sales.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(saleItems.organizationId, organizationId),
        eq(sales.organizationId, organizationId),
        eq(saleItems.productId, productId)
      )
    )
    .orderBy(desc(sales.occurredOn), desc(saleItems.createdAt))
    .limit(200);

  return rows.map((row) => ({
    ...row,
    lineTotal: row.lineTotal,
    quantity: Number(row.quantity),
    status: row.status as ProductSaleHistoryItem["status"],
  }));
}

export async function getProductPriceChangesByProductIdQuery(
  organizationId: string,
  productId: string
): Promise<ProductPriceChangeItem[]> {
  const rows = await db
    .select({
      changedByUserName: users.name,
      createdAt: productPriceChanges.createdAt,
      id: productPriceChanges.id,
      nextPrice: productPriceChanges.nextPrice,
      previousPrice: productPriceChanges.previousPrice,
    })
    .from(productPriceChanges)
    .leftJoin(users, eq(productPriceChanges.changedByUserId, users.id))
    .where(
      and(
        eq(productPriceChanges.organizationId, organizationId),
        eq(productPriceChanges.productId, productId)
      )
    )
    .orderBy(desc(productPriceChanges.createdAt))
    .limit(10);

  return rows;
}
