import "server-only";

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import {
  auditEvents,
  categories,
  productPriceChanges,
  productStockEntries,
  productStockWriteOffs,
  products,
  saleItems,
  sales,
} from "@/db/schema";
import { type TenantTransaction, withTenantContext } from "@/db/tenant-context";
import {
  buildProductAnalytics,
  buildProductSalesHistoryMetrics,
} from "@/features/products/analytics";
import type {
  ProductAnalytics,
  ProductSalesHistoryMetrics,
} from "@/features/products/contracts";
import {
  applyStockAddition,
  applyStockWriteOff,
} from "@/features/products/stock";
import { toCurrencyString } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

interface LockedProductRow extends Record<string, unknown> {
  costPrice: string;
  id: string;
  price: string;
  stock: number;
}

export interface ProductInitialImageMetadata {
  blurDataURL: string;
  height: number;
  version: number;
  width: number;
}

export const getProductAnalytics = async ({
  organizationId,
  today = formatDateInputValue(),
}: {
  organizationId: string;
  today?: string;
}): Promise<ProductAnalytics> => {
  const recentFromDate = new Date(`${today}T00:00:00`);
  recentFromDate.setDate(recentFromDate.getDate() - 29);
  const recentFrom = formatDateInputValue(recentFromDate);
  const [inventoryRows, allPurchaseRows, recentSalesRows] =
    await withTenantContext(organizationId, async (tx) => {
      const inventoryResult = await tx
        .select({
          archivedAt: products.archivedAt,
          categoryName: categories.name,
          costPrice: products.costPrice,
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
        .where(eq(products.organizationId, organizationId))
        .orderBy(asc(products.name));
      const purchaseResult = await tx
        .select({
          occurredOn: productStockEntries.stockedOn,
          quantity: productStockEntries.quantity,
          unitCost: productStockEntries.unitCost,
        })
        .from(productStockEntries)
        .where(eq(productStockEntries.organizationId, organizationId));
      const salesResult = await tx
        .select({
          lineTotal: saleItems.lineTotal,
          occurredOn: sales.occurredOn,
          quantity: saleItems.quantity,
          status: sales.status,
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
            gte(sales.occurredOn, recentFrom),
            lte(sales.occurredOn, today)
          )
        );

      return [inventoryResult, purchaseResult, salesResult] as const;
    });

  return buildProductAnalytics({
    inventory: inventoryRows.map((row) => ({
      archivedAt: row.archivedAt,
      categoryName: row.categoryName,
      costPrice: Number(row.costPrice),
      stock: row.stock,
    })),
    purchases: allPurchaseRows.map((row) => ({
      occurredOn: row.occurredOn,
      quantity: Number(row.quantity),
      unitCost: Number(row.unitCost),
    })),
    sales: recentSalesRows.map((row) => ({
      lineTotal: Number(row.lineTotal),
      occurredOn: row.occurredOn,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
    })),
    today,
  });
};

export const getProductSalesHistoryMetrics = async (
  organizationId: string,
  productId: string
): Promise<ProductSalesHistoryMetrics> => {
  const salesRows = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        lineTotal: saleItems.lineTotal,
        occurredOn: sales.occurredOn,
        quantity: saleItems.quantity,
        status: sales.status,
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
      .orderBy(asc(sales.occurredOn), asc(saleItems.createdAt))
  );

  return buildProductSalesHistoryMetrics({
    sales: salesRows.map((row) => ({
      lineTotal: Number(row.lineTotal),
      occurredOn: row.occurredOn,
      quantity: Number(row.quantity),
      status: row.status as "cancelled" | "completed",
    })),
  });
};

const lockProductForUpdate = async (
  tx: TenantTransaction,
  organizationId: string,
  productId: string
): Promise<LockedProductRow | null> => {
  const result = await tx.execute<LockedProductRow>(sql`
    select id, price, cost_price as "costPrice", stock
    from products
    where id = ${productId} and organization_id = ${organizationId}
    for update
  `);

  return result.rows.at(0) ?? null;
};

export const createProductWithInitialStock = async ({
  actorUserId,
  categoryId,
  costPrice,
  description,
  image,
  name,
  organizationId,
  price,
  productId,
  purchasedOn,
  stock,
}: {
  actorUserId: string;
  categoryId: string;
  costPrice: string;
  description: string | null;
  image: ProductInitialImageMetadata | null;
  name: string;
  organizationId: string;
  price: string;
  productId: string;
  purchasedOn: string;
  stock: number;
}): Promise<void> => {
  await withTenantContext(organizationId, async (tx) => {
    await tx.insert(products).values({
      categoryId,
      costPrice,
      description,
      id: productId,
      name,
      organizationId,
      price,
      purchasedOn,
      stock,
      ...(image
        ? {
            imageBlurDataUrl: image.blurDataURL,
            imageHeight: image.height,
            imageUploadedAt: new Date(),
            imageVersion: image.version,
            imageWidth: image.width,
          }
        : {
            imageBlurDataUrl: null,
            imageHeight: null,
            imageUploadedAt: null,
            imageVersion: null,
            imageWidth: null,
          }),
    });

    if (stock > 0) {
      await tx.insert(productStockEntries).values({
        organizationId,
        productId,
        quantity: stock,
        stockedOn: purchasedOn,
        unitCost: costPrice,
      });
    }

    await tx.insert(auditEvents).values({
      actorUserId,
      organizationId,
      subjectId: productId,
      subjectType: "product",
      type: "product.created",
    });
  });
};

export const updateProductWithPriceHistory = async ({
  actorUserId,
  categoryId,
  description,
  name,
  organizationId,
  price,
  productId,
}: {
  actorUserId: string;
  categoryId: string;
  description: string | null;
  name: string;
  organizationId: string;
  price: string;
  productId: string;
}): Promise<void> => {
  await withTenantContext(organizationId, async (tx) => {
    const product = await lockProductForUpdate(tx, organizationId, productId);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    await tx
      .update(products)
      .set({
        categoryId,
        description,
        name,
        price,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId)
        )
      );

    if (product.price !== price) {
      await tx.insert(productPriceChanges).values({
        changedByUserId: actorUserId,
        nextPrice: price,
        organizationId,
        previousPrice: product.price,
        productId,
      });
    }

    await tx.insert(auditEvents).values({
      actorUserId,
      organizationId,
      subjectId: productId,
      subjectType: "product",
      type: "product.updated",
    });
  });
};

export const addProductStock = async ({
  actorUserId,
  organizationId,
  productId,
  quantity,
  stockedOn,
  unitCost,
}: {
  actorUserId: string;
  organizationId: string;
  productId: string;
  quantity: number;
  stockedOn: string;
  unitCost: number;
}): Promise<void> => {
  await withTenantContext(organizationId, async (tx) => {
    const product = await lockProductForUpdate(tx, organizationId, productId);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const { nextCostPrice, nextStock } = applyStockAddition({
      currentCostPrice: Number(product.costPrice),
      currentStock: product.stock,
      incomingQuantity: quantity,
      incomingUnitCost: unitCost,
    });

    await tx.insert(productStockEntries).values({
      organizationId,
      productId,
      quantity,
      stockedOn,
      unitCost: toCurrencyString(unitCost),
    });

    await tx
      .update(products)
      .set({
        archivedAt: null,
        costPrice: toCurrencyString(nextCostPrice),
        stock: nextStock,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId)
        )
      );

    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { quantity },
      organizationId,
      subjectId: productId,
      subjectType: "stock",
      type: "stock.added",
    });
  });
};

export const writeOffProductStock = async ({
  actorUserId,
  happenedOn,
  notes,
  organizationId,
  productId,
  quantity,
  reason,
}: {
  actorUserId: string;
  happenedOn: string;
  notes: string | null;
  organizationId: string;
  productId: string;
  quantity: number;
  reason: "adjustment" | "operational";
}): Promise<void> => {
  await withTenantContext(organizationId, async (tx) => {
    const product = await lockProductForUpdate(tx, organizationId, productId);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const { nextStock } = applyStockWriteOff({
      currentStock: product.stock,
      quantity,
    });

    await tx.insert(productStockWriteOffs).values({
      happenedOn,
      notes,
      organizationId,
      productId,
      quantity,
      reason,
      unitCostSnapshot: product.costPrice,
    });

    await tx
      .update(products)
      .set({ stock: nextStock, updatedAt: new Date() })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId)
        )
      );

    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { quantity, reason },
      organizationId,
      subjectId: productId,
      subjectType: "stock",
      type: "stock.written_off",
    });
  });
};

export const setProductArchivedState = async ({
  actorUserId,
  archived,
  organizationId,
  productId,
}: {
  actorUserId: string;
  archived: boolean;
  organizationId: string;
  productId: string;
}): Promise<boolean> => {
  const updatedProducts = await withTenantContext(
    organizationId,
    async (tx) => {
      const rows = await tx
        .update(products)
        .set({
          archivedAt: archived ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, productId),
            eq(products.organizationId, organizationId)
          )
        )
        .returning({ id: products.id });

      if (rows.length > 0) {
        await tx.insert(auditEvents).values({
          actorUserId,
          organizationId,
          subjectId: productId,
          subjectType: "product",
          type: archived ? "product.archived" : "product.unarchived",
        });
      }

      return rows;
    }
  );

  return updatedProducts.length > 0;
};
