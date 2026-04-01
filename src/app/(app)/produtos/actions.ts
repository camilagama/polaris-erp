"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import {
  productStockEntries,
  productStockWriteOffs,
  products,
  saleItems,
  sales,
} from "@/db/schema";
import { getProductCategoryById } from "@/features/catalog/server";
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

interface LockedProductRow extends Record<string, unknown> {
  archivedAt: Date | null;
  costPrice: string;
  id: string;
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

export async function createProductAction(data: {
  categoryId: string;
  costPrice: string;
  description?: string;
  name: string;
  price: string;
  purchasedOn: string;
  stock: number;
}) {
  await requireActionSession();
  const parsed = createProductSchema.parse(data);
  const category = await getProductCategoryById(parsed.categoryId);

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        categoryId: parsed.categoryId,
        costPrice: toCurrencyString(parsed.costPrice),
        description: parsed.description || undefined,
        name: parsed.name,
        price: toCurrencyString(parsed.price),
        purchasedOn: parsed.purchasedOn,
        stock: parsed.stock,
      })
      .returning();

    if (parsed.stock > 0) {
      await tx.insert(productStockEntries).values({
        productId: product.id,
        quantity: parsed.stock,
        stockedOn: parsed.purchasedOn,
        unitCost: toCurrencyString(parsed.costPrice),
      });
    }
  });

  revalidateProducts();
}

export async function updateProductAction(
  id: string,
  data: {
    categoryId: string;
    description?: string;
    name: string;
  }
) {
  await requireActionSession();
  const parsed = updateProductSchema.parse(data);
  const category = await getProductCategoryById(parsed.categoryId);

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  await db
    .update(products)
    .set({
      categoryId: parsed.categoryId,
      description: parsed.description || undefined,
      name: parsed.name,
    })
    .where(eq(products.id, id));

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

  await db.transaction(async (tx) => {
    const [product] = await tx
      .select({
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
  });

  revalidateProducts();
}
