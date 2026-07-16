import "server-only";

import {
  auditEvents,
  categories,
  productImages,
  productPriceChanges,
  productStockEntries,
  productStockWriteOffs,
  products,
  saleItems,
  sales,
  stockMovements,
} from "@polaris/db/schema";
import {
  type TenantTransaction,
  withTenantContext,
} from "@polaris/db/tenant-context";
import {
  type CommandExecutionReservation,
  completeCommandExecution,
  reserveCommandExecution,
} from "@polaris/events";
import { and, asc, count, eq, gte, isNull, lte, sql } from "drizzle-orm";
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
import { formatDateInputValue, shiftBusinessDate } from "@/lib/domain/date";
import { getOrganizationPlanEntitlements } from "@/lib/entitlements";

const PRODUCT_QUOTA_LOCK_NAMESPACE = 662_981;
interface LockedProductRow extends Record<string, unknown> {
  costPrice: string;
  id: string;
  price: string;
  softDeletedAt: Date | null;
  stock: number;
}

export interface ProductInitialImageMetadata {
  blurDataURL: string;
  height: number;
  version: number;
  width: number;
}

export const getRecentPerformanceDateRange = (today: string) => ({
  from: shiftBusinessDate(today, -29),
  to: today,
});

export const getProductAnalytics = async ({
  organizationId,
  today = formatDateInputValue(),
}: {
  organizationId: string;
  today?: string;
}): Promise<ProductAnalytics> => {
  const recentRange = getRecentPerformanceDateRange(today);
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
            gte(sales.occurredOn, recentRange.from),
            lte(sales.occurredOn, recentRange.to)
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
    select id, price, cost_price as "costPrice", stock,
      soft_deleted_at as "softDeletedAt"
    from products
    where id = ${productId} and organization_id = ${organizationId}
    for update
  `);

  return result.rows.at(0) ?? null;
};

const assertProductIsOperational = (product: LockedProductRow): void => {
  if (product.softDeletedAt) {
    throw new Error("Produto removido definitivamente.");
  }
};

interface StockCommandResult {
  productId: string;
}

const getStockCommandReplayResult = (
  reservation: CommandExecutionReservation
): StockCommandResult | null => {
  if (reservation.kind === "processing") {
    throw new Error("Operacao de estoque ainda esta em processamento.");
  }

  if (reservation.kind !== "replay") {
    return null;
  }

  if (reservation.status === "failed") {
    throw new Error("A operacao de estoque anterior falhou.");
  }

  const productId = reservation.result.productId;

  if (typeof productId !== "string" || productId.length === 0) {
    throw new Error("Resultado da operacao de estoque invalido.");
  }

  return { productId };
};

const assertCategoryBelongsToOrganization = async (
  tx: TenantTransaction,
  organizationId: string,
  categoryId: string
): Promise<void> => {
  const category = await tx.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      eq(categories.organizationId, organizationId)
    ),
  });

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }
};

const assertRegisteredProductCapacity = async (
  tx: TenantTransaction,
  organizationId: string
): Promise<void> => {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${PRODUCT_QUOTA_LOCK_NAMESPACE}, hashtext(${organizationId}))`
  );

  const entitlements = await getOrganizationPlanEntitlements(
    tx,
    organizationId
  );
  const [{ value: registeredProductCount }] = await tx
    .select({ value: count() })
    .from(products)
    .where(
      and(
        eq(products.organizationId, organizationId),
        isNull(products.softDeletedAt)
      )
    );

  if (
    Number(registeredProductCount ?? 0) >= entitlements.maxRegisteredProducts
  ) {
    throw new Error(
      `Limite de ${entitlements.maxRegisteredProducts} produtos cadastrados atingido.`
    );
  }
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
    await assertCategoryBelongsToOrganization(tx, organizationId, categoryId);
    await assertRegisteredProductCapacity(tx, organizationId);

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

    if (image) {
      await tx.insert(productImages).values({
        blurDataUrl: image.blurDataURL,
        height: image.height,
        organizationId,
        position: 0,
        productId,
        version: image.version,
        width: image.width,
      });
    }

    if (stock > 0) {
      const stockEntryId = crypto.randomUUID();
      await tx.insert(productStockEntries).values({
        id: stockEntryId,
        organizationId,
        productId,
        quantity: stock,
        stockedOn: purchasedOn,
        unitCost: costPrice,
      });
      await tx.insert(stockMovements).values({
        delta: stock,
        occurredOn: purchasedOn,
        organizationId,
        productId,
        sourceId: stockEntryId,
        type: "entry",
        unitCostSnapshot: costPrice,
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
    assertProductIsOperational(product);

    await assertCategoryBelongsToOrganization(tx, organizationId, categoryId);

    const updatedProductRows = await tx
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
      )
      .returning({ id: products.id });

    if (updatedProductRows.length === 0) {
      throw new Error("Produto nao encontrado.");
    }

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
  idempotencyKey,
  organizationId,
  productId,
  quantity,
  stockedOn,
  unitCost,
}: {
  actorUserId: string;
  idempotencyKey: string;
  organizationId: string;
  productId: string;
  quantity: number;
  stockedOn: string;
  unitCost: number;
}): Promise<StockCommandResult> =>
  withTenantContext(organizationId, async (tx) => {
    const reservation = await reserveCommandExecution(tx, {
      commandType: "stock.add",
      correlationId: idempotencyKey,
      idempotencyKey,
      organizationId,
    });
    const replayResult = getStockCommandReplayResult(reservation);

    if (replayResult) {
      return replayResult;
    }
    const product = await lockProductForUpdate(tx, organizationId, productId);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }
    assertProductIsOperational(product);

    const { nextCostPrice, nextStock } = applyStockAddition({
      currentCostPrice: Number(product.costPrice),
      currentStock: product.stock,
      incomingQuantity: quantity,
      incomingUnitCost: unitCost,
    });

    const stockEntryId = crypto.randomUUID();
    await tx.insert(productStockEntries).values({
      id: stockEntryId,
      organizationId,
      productId,
      quantity,
      stockedOn,
      unitCost: toCurrencyString(unitCost),
    });
    await tx.insert(stockMovements).values({
      delta: quantity,
      occurredOn: stockedOn,
      organizationId,
      productId,
      sourceId: stockEntryId,
      type: "entry",
      unitCostSnapshot: toCurrencyString(unitCost),
    });

    const updatedProductRows = await tx
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
      )
      .returning({ id: products.id });

    if (updatedProductRows.length === 0) {
      throw new Error("Produto nao encontrado.");
    }

    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { quantity },
      organizationId,
      subjectId: productId,
      subjectType: "stock",
      type: "stock.added",
    });
    await completeCommandExecution(tx, {
      commandId: reservation.commandId,
      result: { productId },
      status: "succeeded",
    });
    return { productId };
  });

export const writeOffProductStock = async ({
  actorUserId,
  happenedOn,
  idempotencyKey,
  notes,
  organizationId,
  productId,
  quantity,
  reason,
}: {
  actorUserId: string;
  happenedOn: string;
  idempotencyKey: string;
  notes: string | null;
  organizationId: string;
  productId: string;
  quantity: number;
  reason: "adjustment" | "operational";
}): Promise<StockCommandResult> =>
  withTenantContext(organizationId, async (tx) => {
    const reservation = await reserveCommandExecution(tx, {
      commandType: "stock.write_off",
      correlationId: idempotencyKey,
      idempotencyKey,
      organizationId,
    });
    const replayResult = getStockCommandReplayResult(reservation);

    if (replayResult) {
      return replayResult;
    }
    const product = await lockProductForUpdate(tx, organizationId, productId);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }
    assertProductIsOperational(product);

    const { nextStock } = applyStockWriteOff({
      currentStock: product.stock,
      quantity,
    });

    const writeOffId = crypto.randomUUID();
    await tx.insert(productStockWriteOffs).values({
      id: writeOffId,
      happenedOn,
      notes,
      organizationId,
      productId,
      quantity,
      reason,
      unitCostSnapshot: product.costPrice,
    });
    await tx.insert(stockMovements).values({
      delta: -quantity,
      occurredOn: happenedOn,
      organizationId,
      productId,
      sourceId: writeOffId,
      type: "write_off",
      unitCostSnapshot: product.costPrice,
    });

    const updatedProductRows = await tx
      .update(products)
      .set({ stock: nextStock, updatedAt: new Date() })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId)
        )
      )
      .returning({ id: products.id });

    if (updatedProductRows.length === 0) {
      throw new Error("Produto nao encontrado.");
    }

    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { quantity, reason },
      organizationId,
      subjectId: productId,
      subjectType: "stock",
      type: "stock.written_off",
    });
    await completeCommandExecution(tx, {
      commandId: reservation.commandId,
      result: { productId },
      status: "succeeded",
    });
    return { productId };
  });

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
            eq(products.organizationId, organizationId),
            isNull(products.softDeletedAt)
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

export const softDeleteProduct = ({
  actorUserId,
  organizationId,
  productId,
  reason,
}: {
  actorUserId: string;
  organizationId: string;
  productId: string;
  reason: string;
}): Promise<"already_deleted" | "deleted"> =>
  withTenantContext(organizationId, async (tx) => {
    const product = await lockProductForUpdate(tx, organizationId, productId);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    if (product.softDeletedAt) {
      return "already_deleted";
    }

    if (product.stock !== 0) {
      throw new Error("Produto precisa ter estoque zero para remocao final.");
    }

    const now = new Date();
    await tx
      .update(productImages)
      .set({
        removedAt: now,
      })
      .where(
        and(
          eq(productImages.organizationId, organizationId),
          eq(productImages.productId, productId),
          isNull(productImages.removedAt)
        )
      );
    const deletedProducts = await tx
      .update(products)
      .set({
        imageBlurDataUrl: null,
        imageHeight: null,
        imageUploadedAt: null,
        imageVersion: null,
        imageWidth: null,
        softDeletedAt: now,
        softDeletedByUserId: actorUserId,
        softDeleteReason: reason,
        updatedAt: now,
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId),
          isNull(products.softDeletedAt)
        )
      )
      .returning({ id: products.id });

    if (deletedProducts.length === 0) {
      return "already_deleted";
    }

    await tx.insert(auditEvents).values({
      actorUserId,
      metadata: { reason },
      organizationId,
      subjectId: productId,
      subjectType: "product",
      type: "product.soft_deleted",
    });

    return "deleted";
  });
