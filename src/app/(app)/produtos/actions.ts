"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import {
  productPriceChanges,
  productStockEntries,
  productStockWriteOffs,
  products,
  saleItems,
  sales,
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
import { toCurrencyString } from "@/lib/domain/currency";
import { requireActionSession } from "@/lib/server-action-auth";

const revalidateProducts = () => {
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
  archivedAt: Date | null;
  costPrice: string;
  id: string;
  price: string;
  stock: number;
}

const lockProductForUpdate = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  id: string
): Promise<LockedProductRow> => {
  const result = await tx.execute<LockedProductRow>(sql`
    select
      id,
      cost_price as "costPrice",
      price,
      stock,
      archived_at as "archivedAt"
    from products
    where id = ${id}
    for update
  `);
  const product = result.rows[0];

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  return product;
};

const getProductImageState = async (id: string) => {
  const [product] = await db
    .select({
      id: products.id,
      imageVersion: products.imageVersion,
    })
    .from(products)
    .where(eq(products.id, id));

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  return product;
};

export async function createProductAction(data: {
  categoryId: string;
  costPrice: string;
  description?: string;
  name: string;
  price: string;
  purchasedOn: string;
  stagedImage?: StagedProductImageInput;
  stock: number;
}) {
  await requireActionSession();
  const parsed = createProductSchema.parse(data);
  const stagedImage = data.stagedImage
    ? stagedProductImageSchema.parse(data.stagedImage)
    : null;
  const category = await getProductCategoryById(parsed.categoryId);

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  const productId = crypto.randomUUID();
  const storedImage = stagedImage
    ? await storeProductImageFromStage({
        productId,
        stagedImage,
        version: 1,
      })
    : null;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        categoryId: parsed.categoryId,
        costPrice: toCurrencyString(parsed.costPrice),
        description: parsed.description || undefined,
        id: productId,
        imageBlurDataUrl: storedImage?.blurDataURL,
        imageHeight: storedImage?.height,
        imageUploadedAt: storedImage ? new Date() : null,
        imageVersion: storedImage?.version,
        imageWidth: storedImage?.width,
        name: parsed.name,
        price: toCurrencyString(parsed.price),
        purchasedOn: parsed.purchasedOn,
        stock: parsed.stock,
      });

      if (parsed.stock > 0) {
        await tx.insert(productStockEntries).values({
          productId,
          quantity: parsed.stock,
          stockedOn: parsed.purchasedOn,
          unitCost: toCurrencyString(parsed.costPrice),
        });
      }
    });
  } catch (error) {
    if (storedImage) {
      await deleteProductImageVersion({
        productId,
        version: storedImage.version,
      }).catch(() => undefined);
    }

    throw error;
  }

  revalidateProducts();
}

export async function updateProductAction(
  id: string,
  data: {
    categoryId: string;
    description?: string;
    name: string;
    price: string;
  }
) {
  const session = await requireActionSession();
  const parsed = updateProductSchema.parse(data);
  const category = await getProductCategoryById(parsed.categoryId);

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  await db.transaction(async (tx) => {
    const product = await lockProductForUpdate(tx, id);
    const nextPrice = toCurrencyString(parsed.price);

    await tx
      .update(products)
      .set({
        categoryId: parsed.categoryId,
        description: parsed.description || undefined,
        name: parsed.name,
        price: nextPrice,
      })
      .where(eq(products.id, id));

    if (product.price !== nextPrice) {
      await tx.insert(productPriceChanges).values({
        changedByUserId: session.user.id,
        nextPrice,
        previousPrice: product.price,
        productId: id,
      });
    }
  });

  revalidateProducts();
}

export async function replaceProductImageAction(
  id: string,
  stagedImageInput: StagedProductImageInput
) {
  await requireActionSession();
  const stagedImage = stagedProductImageSchema.parse(stagedImageInput);
  const product = await getProductImageState(id);
  const nextVersion = (product.imageVersion ?? 0) + 1;
  const storedImage = await storeProductImageFromStage({
    productId: id,
    stagedImage,
    version: nextVersion,
  });

  try {
    await db
      .update(products)
      .set({
        imageBlurDataUrl: storedImage.blurDataURL,
        imageHeight: storedImage.height,
        imageUploadedAt: new Date(),
        imageVersion: storedImage.version,
        imageWidth: storedImage.width,
      })
      .where(eq(products.id, id));
  } catch (error) {
    await deleteProductImageVersion({
      productId: id,
      version: storedImage.version,
    }).catch(() => undefined);

    throw error;
  }

  if (product.imageVersion !== null) {
    await deleteProductImageVersion({
      productId: id,
      version: product.imageVersion,
    }).catch(() => undefined);
  }

  revalidateProducts();
}

export async function removeProductImageAction(id: string) {
  await requireActionSession();
  const product = await getProductImageState(id);

  await db
    .update(products)
    .set(emptyProductImagePayload)
    .where(eq(products.id, id));

  if (product.imageVersion !== null) {
    await deleteProductImageVersion({
      productId: id,
      version: product.imageVersion,
    }).catch(() => undefined);
  }

  revalidateProducts();
}

export async function addProductStockAction(
  id: string,
  data: {
    quantity: number;
    stockedOn: string;
    unitCost: string;
  }
) {
  await requireActionSession();
  const parsed = stockAdditionSchema.parse(data);

  await db.transaction(async (tx) => {
    const product = await lockProductForUpdate(tx, id);
    const nextSnapshot = applyStockAddition({
      currentCostPrice: Number(product.costPrice),
      currentStock: product.stock,
      incomingQuantity: parsed.quantity,
      incomingUnitCost: parsed.unitCost,
    });

    await tx.insert(productStockEntries).values({
      productId: id,
      quantity: parsed.quantity,
      stockedOn: parsed.stockedOn,
      unitCost: toCurrencyString(parsed.unitCost),
    });

    await tx
      .update(products)
      .set({
        archivedAt: null,
        costPrice: toCurrencyString(nextSnapshot.nextCostPrice),
        stock: nextSnapshot.nextStock,
      })
      .where(eq(products.id, id));
  });

  revalidateProducts();
}

export async function writeOffProductStockAction(
  id: string,
  data: {
    happenedOn: string;
    notes?: string;
    quantity: number;
    reason: "adjustment" | "operational";
  }
) {
  await requireActionSession();
  const parsed = stockWriteOffSchema.parse(data);

  await db.transaction(async (tx) => {
    const product = await lockProductForUpdate(tx, id);
    const nextSnapshot = applyStockWriteOff({
      currentStock: product.stock,
      quantity: parsed.quantity,
    });

    await tx.insert(productStockWriteOffs).values({
      happenedOn: parsed.happenedOn,
      notes: parsed.notes || undefined,
      productId: id,
      quantity: parsed.quantity,
      reason: parsed.reason,
      unitCostSnapshot: product.costPrice,
    });

    await tx
      .update(products)
      .set({
        stock: nextSnapshot.nextStock,
      })
      .where(eq(products.id, id));
  });

  revalidateProducts();
}

export async function archiveProductAction(id: string) {
  await requireActionSession();
  await db
    .update(products)
    .set({
      archivedAt: new Date(),
    })
    .where(eq(products.id, id));

  revalidateProducts();
}

export async function unarchiveProductAction(id: string) {
  await requireActionSession();
  await db
    .update(products)
    .set({
      archivedAt: null,
    })
    .where(eq(products.id, id));

  revalidateProducts();
}

export async function deleteProductAction(id: string, confirmationName = "") {
  await requireActionSession();
  let deletedImageVersion: number | null = null;

  await db.transaction(async (tx) => {
    const [product] = await tx
      .select({
        imageVersion: products.imageVersion,
        name: products.name,
      })
      .from(products)
      .where(eq(products.id, id));

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const relatedSales = await tx
      .selectDistinct({ saleId: saleItems.saleId })
      .from(saleItems)
      .where(eq(saleItems.productId, id));

    if (relatedSales.length > 0) {
      if (confirmationName.trim() !== product.name) {
        throw new Error(
          `Digite exatamente "${product.name}" para confirmar a exclusao com vendas vinculadas.`
        );
      }

      await tx.delete(sales).where(
        inArray(
          sales.id,
          relatedSales.map((item) => item.saleId)
        )
      );
    }

    await tx.delete(products).where(eq(products.id, id));
    deletedImageVersion = product.imageVersion;
  });

  if (deletedImageVersion !== null) {
    await deleteProductImageVersion({
      productId: id,
      version: deletedImageVersion,
    }).catch(() => undefined);
  }

  revalidateProducts();
}
