"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { db } from "@/db";
import {
  productPriceChanges,
  productStockEntries,
  productStockWriteOffs,
  products,
} from "@/db/schema";
import { getProductCategoryById } from "@/features/catalog/server";
import {
  type StagedProductImageInput,
  stagedProductImageSchema,
} from "@/features/products/image-schema";
import { deleteProductImageVersion } from "@/features/products/image-storage";
import { storeProductImageFromStage } from "@/features/products/image-workflow";
import {
  createProductSchema,
  stockAdditionSchema,
  stockWriteOffSchema,
  updateProductSchema,
} from "@/features/products/schema";
import {
  applyStockAddition,
  applyStockWriteOff,
} from "@/features/products/stock";
import { requireAppContext } from "@/lib/app-session";
import { recordAuditEvent } from "@/lib/audit-log";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";
import { toCurrencyString } from "@/lib/domain/currency";

const revalidateCatalogViews = (organizationId: string) => {
  updateTag(buildOrganizationCacheTags(organizationId).catalog);
  refresh();
};

const revalidateSharedAnalytics = (organizationId: string) => {
  updateTag(buildOrganizationCacheTags(organizationId).analytics);
  refresh();
};

const revalidateCatalogAndAnalytics = (organizationId: string) => {
  const tags = buildOrganizationCacheTags(organizationId);
  updateTag(tags.catalog);
  updateTag(tags.analytics);
  refresh();
};

const emptyProductImagePayload = {
  imageBlurDataUrl: null,
  imageHeight: null,
  imageUploadedAt: null,
  imageVersion: null,
  imageWidth: null,
} as const;

interface LockedProductRow extends Record<string, unknown> {
  costPrice: string;
  id: string;
  price: string;
  stock: number;
}

const lockProductForUpdate = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  organizationId: string,
  id: string
) => {
  const result = await tx.execute<LockedProductRow>(sql`
    select id, price, cost_price as "costPrice", stock
    from products
    where id = ${id} and organization_id = ${organizationId}
    for update
  `);

  return result.rows.at(0) ?? null;
};

const getProductImageState = async (organizationId: string, id: string) => {
  const [product] = await db
    .select({
      id: products.id,
      imageVersion: products.imageVersion,
    })
    .from(products)
    .where(
      and(eq(products.id, id), eq(products.organizationId, organizationId))
    )
    .limit(1);

  return product ?? null;
};

const firstZodErrorMessage = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Dados invalidos.";

export async function createProductAction(input: unknown): Promise<string> {
  const context = await requireAppContext("products:write");
  const result = createProductSchema.safeParse(input);
  const stagedImage =
    typeof input === "object" && input !== null && "stagedImage" in input
      ? stagedProductImageSchema.safeParse(input.stagedImage)
      : null;

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  const category = await getProductCategoryById(
    context.organizationId,
    result.data.categoryId
  );

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  const productId = crypto.randomUUID();
  let storedImage: Awaited<
    ReturnType<typeof storeProductImageFromStage>
  > | null = null;

  try {
    if (stagedImage?.success) {
      storedImage = await storeProductImageFromStage({
        organizationId: context.organizationId,
        productId,
        stagedImage: stagedImage.data,
        userId: context.userId,
        version: 1,
      });
    }

    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        categoryId: result.data.categoryId,
        costPrice: toCurrencyString(result.data.costPrice),
        description: result.data.description || null,
        id: productId,
        name: result.data.name,
        organizationId: context.organizationId,
        price: toCurrencyString(result.data.price),
        purchasedOn: result.data.purchasedOn,
        stock: result.data.stock,
        ...(storedImage
          ? {
              imageBlurDataUrl: storedImage.blurDataURL,
              imageHeight: storedImage.height,
              imageUploadedAt: new Date(),
              imageVersion: storedImage.version,
              imageWidth: storedImage.width,
            }
          : emptyProductImagePayload),
      });

      if (result.data.stock > 0) {
        await tx.insert(productStockEntries).values({
          organizationId: context.organizationId,
          productId,
          quantity: result.data.stock,
          stockedOn: result.data.purchasedOn,
          unitCost: toCurrencyString(result.data.costPrice),
        });
      }
    });
  } catch (error) {
    if (storedImage) {
      await deleteProductImageVersion({
        organizationId: context.organizationId,
        productId,
        version: storedImage.version,
      });
    }

    throw error;
  }

  revalidateCatalogAndAnalytics(context.organizationId);
  await recordAuditEvent({
    context,
    subjectId: productId,
    subjectType: "product",
    type: "product.created",
  });
  return productId;
}

export async function updateProductAction(id: string, input: unknown) {
  const context = await requireAppContext("products:write");
  const result = updateProductSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  const category = await getProductCategoryById(
    context.organizationId,
    result.data.categoryId
  );

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  await db.transaction(async (tx) => {
    const product = await lockProductForUpdate(tx, context.organizationId, id);

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const nextPrice = toCurrencyString(result.data.price);

    await tx
      .update(products)
      .set({
        categoryId: result.data.categoryId,
        description: result.data.description || null,
        name: result.data.name,
        price: nextPrice,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, context.organizationId)
        )
      );

    const priceChanged = product.price !== nextPrice;

    if (priceChanged) {
      await tx.insert(productPriceChanges).values({
        changedByUserId: context.userId,
        nextPrice,
        organizationId: context.organizationId,
        previousPrice: product.price,
        productId: id,
      });
    }
  });

  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "product",
    type: "product.updated",
  });
}

export async function replaceProductImageAction(
  id: string,
  image: StagedProductImageInput
) {
  const context = await requireAppContext("products:write");
  const parsed = stagedProductImageSchema.safeParse(image);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      success: false,
    } as const;
  }

  const product = await getProductImageState(context.organizationId, id);

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  const oldVersion = product.imageVersion;
  const storedImage = await storeProductImageFromStage({
    organizationId: context.organizationId,
    productId: id,
    stagedImage: parsed.data,
    userId: context.userId,
    version: (oldVersion ?? 0) + 1,
  });

  if (!storedImage) {
    return { success: true } as const;
  }

  await db
    .update(products)
    .set({
      imageBlurDataUrl: storedImage.blurDataURL,
      imageHeight: storedImage.height,
      imageUploadedAt: new Date(),
      imageVersion: storedImage.version,
      imageWidth: storedImage.width,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, id),
        eq(products.organizationId, context.organizationId),
        oldVersion === null
          ? isNull(products.imageVersion)
          : eq(products.imageVersion, oldVersion)
      )
    );

  if (oldVersion !== null) {
    await deleteProductImageVersion({
      organizationId: context.organizationId,
      productId: id,
      version: oldVersion,
    });
  }

  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "product_image",
    type: "product_image.replaced",
  });
  return { success: true } as const;
}

export async function removeProductImageAction(id: string) {
  const context = await requireAppContext("products:write");
  const product = await getProductImageState(context.organizationId, id);

  if (!product?.imageVersion) {
    return { success: true } as const;
  }

  await db
    .update(products)
    .set({
      ...emptyProductImagePayload,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, id),
        eq(products.organizationId, context.organizationId)
      )
    );

  await deleteProductImageVersion({
    organizationId: context.organizationId,
    productId: id,
    version: product.imageVersion,
  });

  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "product_image",
    type: "product_image.removed",
  });
  return { success: true } as const;
}

export async function addProductStockAction(productId: string, input: unknown) {
  const context = await requireAppContext("products:write");
  const result = stockAdditionSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  await db.transaction(async (tx) => {
    const product = await lockProductForUpdate(
      tx,
      context.organizationId,
      productId
    );

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const { nextCostPrice, nextStock } = applyStockAddition({
      currentCostPrice: Number(product.costPrice),
      currentStock: product.stock,
      incomingQuantity: result.data.quantity,
      incomingUnitCost: result.data.unitCost,
    });

    await tx.insert(productStockEntries).values({
      organizationId: context.organizationId,
      productId,
      quantity: result.data.quantity,
      stockedOn: result.data.stockedOn,
      unitCost: toCurrencyString(result.data.unitCost),
    });

    await tx
      .update(products)
      .set({
        costPrice: toCurrencyString(nextCostPrice),
        stock: nextStock,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, context.organizationId)
        )
      );
  });

  revalidateSharedAnalytics(context.organizationId);
  await recordAuditEvent({
    context,
    metadata: { quantity: result.data.quantity },
    subjectId: productId,
    subjectType: "stock",
    type: "stock.added",
  });
}

export async function writeOffProductStockAction(
  productId: string,
  input: unknown
) {
  const context = await requireAppContext("products:write");
  const result = stockWriteOffSchema.safeParse(input);

  if (!result.success) {
    throw new Error(firstZodErrorMessage(result.error));
  }

  await db.transaction(async (tx) => {
    const product = await lockProductForUpdate(
      tx,
      context.organizationId,
      productId
    );

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const { nextStock } = applyStockWriteOff({
      currentStock: product.stock,
      quantity: result.data.quantity,
    });

    await tx.insert(productStockWriteOffs).values({
      happenedOn: result.data.happenedOn,
      notes: result.data.notes || null,
      organizationId: context.organizationId,
      productId,
      quantity: result.data.quantity,
      reason: result.data.reason,
      unitCostSnapshot: product.costPrice,
    });

    await tx
      .update(products)
      .set({ stock: nextStock, updatedAt: new Date() })
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, context.organizationId)
        )
      );
  });

  revalidateSharedAnalytics(context.organizationId);
  await recordAuditEvent({
    context,
    metadata: { quantity: result.data.quantity, reason: result.data.reason },
    subjectId: productId,
    subjectType: "stock",
    type: "stock.written_off",
  });
}

export async function archiveProductAction(id: string) {
  const context = await requireAppContext("products:write");

  await db
    .update(products)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(products.id, id),
        eq(products.organizationId, context.organizationId)
      )
    );

  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "product",
    type: "product.archived",
  });
}

export async function unarchiveProductAction(id: string) {
  const context = await requireAppContext("products:write");

  await db
    .update(products)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(products.id, id),
        eq(products.organizationId, context.organizationId)
      )
    );

  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "product",
    type: "product.unarchived",
  });
}
