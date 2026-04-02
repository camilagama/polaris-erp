import { asc, desc, eq, lt } from "drizzle-orm";
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
  ProductStockEntryItem,
  ProductStockWriteOffItem,
} from "@/features/products/contracts";
import { buildProductImageUrl } from "@/features/products/image-urls";

const DEFAULT_PAGE_SIZE = 50;

const mapProductImage = (row: {
  id: string;
  imageBlurDataUrl: string | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageWidth: number | null;
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
    detailUrl: buildProductImageUrl(row.id, row.imageVersion, "detail"),
    height: row.imageHeight,
    tableUrl: buildProductImageUrl(row.id, row.imageVersion, "table"),
    version: row.imageVersion,
    width: row.imageWidth,
  };
};

export interface PaginatedProductsList {
  items: ProductListItem[];
  nextCursor: string | null;
}

export async function getProductsQuery(
  cursor?: string,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedProductsList> {
  const limit = pageSize + 1;

  const baseQuery = db
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
      price: products.price,
      purchasedOn: products.purchasedOn,
      stock: products.stock,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.name), asc(products.createdAt))
    .limit(limit);

  if (cursor) {
    baseQuery.where(lt(products.createdAt, new Date(cursor)));
  }

  const rows = await baseQuery;
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;

  return {
    items: items.map((row) => ({
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
    })),
    nextCursor: hasMore
      ? (items.at(-1)?.createdAt.toISOString() ?? null)
      : null,
  };
}

export async function getProductByIdQuery(
  id: string
): Promise<ProductListItem | undefined> {
  const row = await db
    .select({
      archivedAt: products.archivedAt,
      categoryId: products.categoryId,
      categoryName: categories.name,
      costPrice: products.costPrice,
      description: products.description,
      id: products.id,
      imageBlurDataUrl: products.imageBlurDataUrl,
      imageHeight: products.imageHeight,
      imageVersion: products.imageVersion,
      imageWidth: products.imageWidth,
      name: products.name,
      price: products.price,
      purchasedOn: products.purchasedOn,
      stock: products.stock,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .then((rows) => rows[0]);

  if (!row) {
    return undefined;
  }

  return {
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
  };
}

export async function getProductStockEntriesByProductIdQuery(
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
    .where(eq(productStockEntries.productId, productId))
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
    .where(eq(productStockWriteOffs.productId, productId))
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
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(eq(saleItems.productId, productId))
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
    .where(eq(productPriceChanges.productId, productId))
    .orderBy(desc(productPriceChanges.createdAt))
    .limit(10);

  return rows;
}
