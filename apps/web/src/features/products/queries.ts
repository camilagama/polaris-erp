import "server-only";

import {
  decodeOpaqueCursor,
  encodeOpaqueCursor,
} from "@polaris/db/opaque-cursor";
import {
  categories,
  productPriceChanges,
  productStockEntries,
  productStockWriteOffs,
  products,
  saleItems,
  sales,
  users,
} from "@polaris/db/schema";
import { withTenantContext } from "@polaris/db/tenant-context";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import type {
  InventoryMovementFilterProduct,
  InventoryMovementFilters,
  InventoryMovementItem,
  InventoryMovementsResult,
  InventoryMovementType,
  ProductListItem,
  ProductPriceChangeItem,
  ProductSaleHistoryItem,
  ProductStatusFilter,
  ProductStockEntryItem,
  ProductStockWriteOffItem,
} from "@/features/products/contracts";
import { buildProductImageUrl } from "@/features/products/image-urls";

const DEFAULT_PAGE_SIZE = 15;
const INVENTORY_MOVEMENTS_LIMIT = 200;
const INVENTORY_MOVEMENT_TYPES = [
  "entry",
  "sale",
  "sale_reversal",
  "write_off",
] as const satisfies InventoryMovementType[];
const DATE_FILTER_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
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

const isInventoryMovementType = (
  value: string | undefined
): value is InventoryMovementType =>
  Boolean(value) &&
  INVENTORY_MOVEMENT_TYPES.includes(value as InventoryMovementType);

const isDateFilter = (value: string | undefined): value is string =>
  Boolean(value && DATE_FILTER_PATTERN.test(value));

export const normalizeInventoryMovementFilters = (input: {
  from?: string | string[];
  productId?: string | string[];
  to?: string | string[];
  type?: string | string[];
}): InventoryMovementFilters => {
  const rawFrom = typeof input.from === "string" ? input.from.trim() : "";
  const rawProductId =
    typeof input.productId === "string" ? input.productId.trim() : "";
  const rawTo = typeof input.to === "string" ? input.to.trim() : "";
  const rawType = typeof input.type === "string" ? input.type.trim() : "";

  return {
    ...(isDateFilter(rawFrom) ? { from: rawFrom } : {}),
    ...(rawProductId ? { productId: rawProductId } : {}),
    ...(isDateFilter(rawTo) ? { to: rawTo } : {}),
    ...(isInventoryMovementType(rawType) ? { type: rawType } : {}),
  };
};

const byNewestMovement = (
  left: InventoryMovementItem,
  right: InventoryMovementItem
) => {
  const dateComparison = right.date.localeCompare(left.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return right.createdAt.getTime() - left.createdAt.getTime();
};

const shouldQueryMovementType = (
  filters: InventoryMovementFilters,
  type: InventoryMovementType
) => !filters.type || filters.type === type;

const listProductsForInventoryMovementFilter = (
  organizationId: string
): Promise<InventoryMovementFilterProduct[]> =>
  withTenantContext(organizationId, (tx) =>
    tx
      .select({
        id: products.id,
        name: products.name,
      })
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          isNull(products.softDeletedAt)
        )
      )
      .orderBy(asc(products.name), asc(products.createdAt), asc(products.id))
      .limit(250)
  );

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
    isNull(products.softDeletedAt),
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

  const rows = await withTenantContext(organizationId, (tx) =>
    tx
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
      .limit(limit)
  );

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const lastItem = items.at(-1);

  return {
    items: items.map(mapProductListItem),
    nextCursor: hasMore && lastItem ? buildProductsCursor(lastItem) : null,
  };
}

interface InventoryMovementsQueryInput {
  cursor?: string;
  filters: InventoryMovementFilters;
  organizationId: string;
}

const getEntryMovements = ({
  filters,
  organizationId,
}: InventoryMovementsQueryInput): Promise<InventoryMovementItem[]> => {
  const entryFilters: SQL[] = [
    eq(productStockEntries.organizationId, organizationId),
  ];

  if (filters.productId) {
    entryFilters.push(eq(productStockEntries.productId, filters.productId));
  }

  if (filters.from) {
    entryFilters.push(gte(productStockEntries.stockedOn, filters.from));
  }

  if (filters.to) {
    entryFilters.push(lte(productStockEntries.stockedOn, filters.to));
  }

  return withTenantContext(organizationId, (tx) =>
    tx
      .select({
        createdAt: productStockEntries.createdAt,
        date: productStockEntries.stockedOn,
        id: productStockEntries.id,
        productId: productStockEntries.productId,
        productName: products.name,
        quantity: productStockEntries.quantity,
        unitCost: productStockEntries.unitCost,
      })
      .from(productStockEntries)
      .innerJoin(
        products,
        and(
          eq(productStockEntries.productId, products.id),
          eq(products.organizationId, organizationId)
        )
      )
      .where(and(...entryFilters))
      .orderBy(
        desc(productStockEntries.stockedOn),
        desc(productStockEntries.createdAt)
      )
      .limit(INVENTORY_MOVEMENTS_LIMIT)
      .then((rows) =>
        rows.map((row) => ({
          createdAt: row.createdAt,
          date: row.date,
          id: row.id,
          notes: null,
          productId: row.productId,
          productName: row.productName,
          quantity: Number(row.quantity),
          totalValue: Number(row.quantity) * Number(row.unitCost),
          type: "entry" as const,
          unitCost: Number(row.unitCost),
        }))
      )
  );
};

const getWriteOffMovements = ({
  filters,
  organizationId,
}: InventoryMovementsQueryInput): Promise<InventoryMovementItem[]> => {
  const writeOffFilters: SQL[] = [
    eq(productStockWriteOffs.organizationId, organizationId),
  ];

  if (filters.productId) {
    writeOffFilters.push(
      eq(productStockWriteOffs.productId, filters.productId)
    );
  }

  if (filters.from) {
    writeOffFilters.push(gte(productStockWriteOffs.happenedOn, filters.from));
  }

  if (filters.to) {
    writeOffFilters.push(lte(productStockWriteOffs.happenedOn, filters.to));
  }

  return withTenantContext(organizationId, (tx) =>
    tx
      .select({
        createdAt: productStockWriteOffs.createdAt,
        date: productStockWriteOffs.happenedOn,
        id: productStockWriteOffs.id,
        notes: productStockWriteOffs.notes,
        productId: productStockWriteOffs.productId,
        productName: products.name,
        quantity: productStockWriteOffs.quantity,
        unitCost: productStockWriteOffs.unitCostSnapshot,
      })
      .from(productStockWriteOffs)
      .innerJoin(
        products,
        and(
          eq(productStockWriteOffs.productId, products.id),
          eq(products.organizationId, organizationId)
        )
      )
      .where(and(...writeOffFilters))
      .orderBy(
        desc(productStockWriteOffs.happenedOn),
        desc(productStockWriteOffs.createdAt)
      )
      .limit(INVENTORY_MOVEMENTS_LIMIT)
      .then((rows) =>
        rows.map((row) => ({
          createdAt: row.createdAt,
          date: row.date,
          id: row.id,
          notes: row.notes,
          productId: row.productId,
          productName: row.productName,
          quantity: -Number(row.quantity),
          totalValue: Number(row.quantity) * Number(row.unitCost),
          type: "write_off" as const,
          unitCost: Number(row.unitCost),
        }))
      )
  );
};

const getSaleMovements = ({
  filters,
  organizationId,
}: InventoryMovementsQueryInput): Promise<InventoryMovementItem[]> => {
  const saleFilters: SQL[] = [
    eq(saleItems.organizationId, organizationId),
    eq(sales.organizationId, organizationId),
  ];

  if (filters.productId) {
    saleFilters.push(eq(saleItems.productId, filters.productId));
  }

  if (filters.from) {
    saleFilters.push(gte(sales.occurredOn, filters.from));
  }

  if (filters.to) {
    saleFilters.push(lte(sales.occurredOn, filters.to));
  }

  return withTenantContext(organizationId, (tx) =>
    tx
      .select({
        createdAt: saleItems.createdAt,
        date: sales.occurredOn,
        id: saleItems.id,
        productId: saleItems.productId,
        productName: products.name,
        quantity: saleItems.quantity,
        saleId: sales.id,
        unitCost: saleItems.unitCostSnapshot,
      })
      .from(saleItems)
      .innerJoin(
        sales,
        and(
          eq(saleItems.saleId, sales.id),
          eq(sales.organizationId, organizationId)
        )
      )
      .innerJoin(
        products,
        and(
          eq(saleItems.productId, products.id),
          eq(products.organizationId, organizationId)
        )
      )
      .where(and(...saleFilters))
      .orderBy(desc(sales.occurredOn), desc(saleItems.createdAt))
      .limit(INVENTORY_MOVEMENTS_LIMIT)
      .then((rows) =>
        rows.map((row) => ({
          createdAt: row.createdAt,
          date: row.date,
          id: `sale-${row.id}`,
          notes: `Venda ${row.saleId}`,
          productId: row.productId,
          productName: row.productName,
          quantity: -Number(row.quantity),
          totalValue: Number(row.quantity) * Number(row.unitCost),
          type: "sale" as const,
          unitCost: Number(row.unitCost),
        }))
      )
  );
};

const getSaleReversalMovements = ({
  filters,
  organizationId,
}: InventoryMovementsQueryInput): Promise<InventoryMovementItem[]> => {
  const reversalDate = sales.cancelledOn;
  const reversalFilters: SQL[] = [
    eq(saleItems.organizationId, organizationId),
    eq(sales.organizationId, organizationId),
    isNotNull(sales.cancelledOn),
  ];

  if (filters.productId) {
    reversalFilters.push(eq(saleItems.productId, filters.productId));
  }

  if (filters.from) {
    reversalFilters.push(gte(reversalDate, filters.from));
  }

  if (filters.to) {
    reversalFilters.push(lte(reversalDate, filters.to));
  }

  return withTenantContext(organizationId, (tx) =>
    tx
      .select({
        createdAt: sales.cancelledAt,
        date: reversalDate,
        id: saleItems.id,
        productId: saleItems.productId,
        productName: products.name,
        quantity: saleItems.quantity,
        saleId: sales.id,
        unitCost: saleItems.unitCostSnapshot,
      })
      .from(saleItems)
      .innerJoin(
        sales,
        and(
          eq(saleItems.saleId, sales.id),
          eq(sales.organizationId, organizationId)
        )
      )
      .innerJoin(
        products,
        and(
          eq(saleItems.productId, products.id),
          eq(products.organizationId, organizationId)
        )
      )
      .where(and(...reversalFilters))
      .orderBy(desc(sales.cancelledAt), desc(saleItems.createdAt))
      .limit(INVENTORY_MOVEMENTS_LIMIT)
      .then((rows) => {
        const movements: InventoryMovementItem[] = [];

        for (const row of rows) {
          if (row.date === null) {
            continue;
          }

          movements.push({
            createdAt: row.createdAt ?? new Date(`${row.date}T12:00:00Z`),
            date: row.date,
            id: `sale-reversal-${row.id}`,
            notes: `Venda ${row.saleId} cancelada`,
            productId: row.productId,
            productName: row.productName,
            quantity: Number(row.quantity),
            totalValue: Number(row.quantity) * Number(row.unitCost),
            type: "sale_reversal" as const,
            unitCost: Number(row.unitCost),
          });
        }

        return movements;
      })
  );
};

const getMovementQueries = (
  input: InventoryMovementsQueryInput
): Promise<InventoryMovementItem[]>[] => {
  const queries: Promise<InventoryMovementItem[]>[] = [];

  if (shouldQueryMovementType(input.filters, "entry")) {
    queries.push(getEntryMovements(input));
  }

  if (shouldQueryMovementType(input.filters, "write_off")) {
    queries.push(getWriteOffMovements(input));
  }

  if (shouldQueryMovementType(input.filters, "sale")) {
    queries.push(getSaleMovements(input));
  }

  if (shouldQueryMovementType(input.filters, "sale_reversal")) {
    queries.push(getSaleReversalMovements(input));
  }

  return queries;
};

const inventoryMovementsCursorSchema = z.object({
  offset: z.number().int().nonnegative(),
  version: z.literal(1),
});

export async function getInventoryMovementsQuery(
  input: InventoryMovementsQueryInput
): Promise<InventoryMovementsResult> {
  const [productsForFilter, movementGroups] = await Promise.all([
    listProductsForInventoryMovementFilter(input.organizationId),
    Promise.all(getMovementQueries(input)),
  ]);

  const offset = input.cursor
    ? decodeOpaqueCursor(
        input.cursor,
        inventoryMovementsCursorSchema,
        "Cursor de movimentacoes invalido."
      ).offset
    : 0;

  const pageSize = DEFAULT_PAGE_SIZE;
  const limit = pageSize + 1;

  const items = movementGroups
    .flat()
    .sort(byNewestMovement)
    .slice(offset, offset + limit);

  const hasMore = items.length > pageSize;
  const pageItems = hasMore ? items.slice(0, pageSize) : items;

  const nextCursor = hasMore
    ? encodeOpaqueCursor({ offset: offset + pageSize, version: 1 })
    : null;

  return {
    filters: input.filters,
    items: pageItems,
    nextCursor,
    products: productsForFilter,
  };
}

export async function getProductByIdQuery(
  organizationId: string,
  id: string
): Promise<ProductListItem | undefined> {
  const row = await withTenantContext(organizationId, (tx) =>
    tx
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
        and(
          eq(products.id, id),
          eq(products.organizationId, organizationId),
          isNull(products.softDeletedAt)
        )
      )
      .then((rows) => rows[0])
  );

  if (!row) {
    return;
  }

  return mapProductListItem(row);
}

export async function getProductStockEntriesByProductIdQuery(
  organizationId: string,
  productId: string
): Promise<ProductStockEntryItem[]> {
  const entries = await withTenantContext(organizationId, (tx) =>
    tx
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
      .limit(200)
  );

  return entries.map((entry) => ({
    ...entry,
    quantity: Number(entry.quantity),
  }));
}

export async function getProductStockWriteOffsByProductIdQuery(
  organizationId: string,
  productId: string
): Promise<ProductStockWriteOffItem[]> {
  const writeOffs = await withTenantContext(organizationId, (tx) =>
    tx
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
      .limit(200)
  );

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
  const rows = await withTenantContext(organizationId, (tx) =>
    tx
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
      .limit(200)
  );

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
  const rows = await withTenantContext(organizationId, (tx) =>
    tx
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
      .limit(10)
  );

  return rows;
}
