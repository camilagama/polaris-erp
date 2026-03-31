"use server";

import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  categories,
  productStockEntries,
  productStockWriteOffs,
  products,
  saleItems,
  sales,
} from "@/db/schema";
import { getProductCategoryById } from "@/features/catalog/server";
import {
  applyStockAddition,
  applyStockWriteOff,
} from "@/features/products/stock";
import { requireActionSession } from "@/lib/server-action-auth";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve usar o formato ISO YYYY-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Data invalida.");

const createProductSchema = z.object({
  categoryId: z.string().min(1, "Categoria e obrigatoria."),
  costPrice: z.coerce.number().min(0, "Custo invalido."),
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nome e obrigatorio."),
  price: z.coerce.number().min(0, "Preco invalido."),
  purchasedOn: isoDateSchema,
  stock: z.coerce
    .number()
    .int("Estoque deve ser um numero inteiro.")
    .min(0, "Estoque deve ser maior ou igual a zero."),
});

const updateProductSchema = z.object({
  categoryId: z.string().min(1, "Categoria e obrigatoria."),
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nome e obrigatorio."),
});

const stockAdditionSchema = z.object({
  quantity: z.coerce
    .number()
    .int("Quantidade deve ser um numero inteiro.")
    .min(1, "Quantidade deve ser maior que zero."),
  stockedOn: isoDateSchema,
  unitCost: z.coerce.number().min(0, "Custo invalido."),
});

const stockWriteOffSchema = z.object({
  happenedOn: isoDateSchema,
  notes: z.string().trim().max(240).optional(),
  quantity: z.coerce
    .number()
    .int("Quantidade deve ser um numero inteiro.")
    .min(1, "Quantidade deve ser maior que zero."),
  reason: z.enum(["adjustment", "operational"]),
});

const revalidateProducts = () => {
  revalidatePath("/produtos");
  revalidatePath("/configuracoes");
  revalidatePath("/vendas");
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

export interface ProductListItem {
  archivedAt: Date | null;
  categoryId: string;
  categoryName: string;
  costPrice: string;
  description: string | null;
  id: string;
  name: string;
  price: string;
  purchasedOn: string;
  stock: number;
}

export interface ProductStockEntryItem {
  createdAt: Date;
  id: string;
  productId: string;
  quantity: number;
  stockedOn: string;
  unitCost: string;
}

export interface ProductStockWriteOffItem {
  createdAt: Date;
  happenedOn: string;
  id: string;
  notes: string | null;
  productId: string;
  quantity: number;
  reason: "adjustment" | "operational";
  unitCostSnapshot: string;
}

export interface ProductSaleHistoryItem {
  cancelledAt: Date | null;
  createdAt: Date;
  id: string;
  occurredOn: string;
  quantity: number;
  saleId: string;
  status: "cancelled" | "completed";
  unitCostSnapshot: string;
}

export async function getProductsAction(): Promise<ProductListItem[]> {
  return await db
    .select({
      archivedAt: products.archivedAt,
      categoryId: products.categoryId,
      categoryName: categories.name,
      costPrice: products.costPrice,
      description: products.description,
      id: products.id,
      name: products.name,
      price: products.price,
      purchasedOn: products.purchasedOn,
      stock: products.stock,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.name));
}

export async function getProductByIdAction(
  id: string
): Promise<ProductListItem | undefined> {
  return await db
    .select({
      archivedAt: products.archivedAt,
      categoryId: products.categoryId,
      categoryName: categories.name,
      costPrice: products.costPrice,
      description: products.description,
      id: products.id,
      name: products.name,
      price: products.price,
      purchasedOn: products.purchasedOn,
      stock: products.stock,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .then((rows) => rows[0]);
}

export async function getProductStockEntriesAction(): Promise<
  ProductStockEntryItem[]
> {
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
    .orderBy(
      asc(productStockEntries.stockedOn),
      asc(productStockEntries.createdAt)
    );

  return entries.map((entry) => ({
    ...entry,
    quantity: Number(entry.quantity),
  }));
}

export async function getProductStockEntriesByProductIdAction(
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
    );

  return entries.map((entry) => ({
    ...entry,
    quantity: Number(entry.quantity),
  }));
}

export async function getProductStockWriteOffsByProductIdAction(
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
    );

  return writeOffs.map((writeOff) => ({
    ...writeOff,
    quantity: Number(writeOff.quantity),
    reason: writeOff.reason as ProductStockWriteOffItem["reason"],
  }));
}

export async function getProductSalesByProductIdAction(
  productId: string
): Promise<ProductSaleHistoryItem[]> {
  const rows = await db
    .select({
      cancelledAt: sales.cancelledAt,
      createdAt: saleItems.createdAt,
      id: saleItems.id,
      occurredOn: sales.occurredOn,
      quantity: saleItems.quantity,
      saleId: sales.id,
      status: sales.status,
      unitCostSnapshot: saleItems.unitCostSnapshot,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(eq(saleItems.productId, productId))
    .orderBy(desc(sales.occurredOn), desc(saleItems.createdAt));

  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    status: row.status as ProductSaleHistoryItem["status"],
  }));
}

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
        costPrice: parsed.costPrice.toFixed(2),
        description: parsed.description || undefined,
        name: parsed.name,
        price: parsed.price.toFixed(2),
        purchasedOn: parsed.purchasedOn,
        stock: parsed.stock,
      })
      .returning();

    if (parsed.stock > 0) {
      await tx.insert(productStockEntries).values({
        productId: product.id,
        quantity: parsed.stock,
        stockedOn: parsed.purchasedOn,
        unitCost: parsed.costPrice.toFixed(2),
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
      unitCost: parsed.unitCost.toFixed(2),
    });

    await tx
      .update(products)
      .set({
        archivedAt: null,
        costPrice: nextSnapshot.nextCostPrice.toFixed(2),
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

export async function deleteProductAction(id: string) {
  await requireActionSession();

  await db.transaction(async (tx) => {
    const relatedSales = await tx
      .selectDistinct({ saleId: saleItems.saleId })
      .from(saleItems)
      .where(eq(saleItems.productId, id));

    if (relatedSales.length > 0) {
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
