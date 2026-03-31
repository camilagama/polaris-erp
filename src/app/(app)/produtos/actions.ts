"use server";

import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories, productStockEntries, products } from "@/db/schema";
import { getProductCategoryById } from "@/features/catalog/server";
import { calculateWeightedCostPrice } from "@/features/products/stock";

const createProductSchema = z.object({
  categoryId: z.string().min(1, "Categoria e obrigatoria."),
  costPrice: z.coerce.number().min(0, "Custo invalido."),
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nome e obrigatorio."),
  price: z.coerce.number().min(0, "Preco invalido."),
  purchasedOn: z.string().min(1, "Data de compra invalida."),
  stock: z.coerce.number().int().min(0, "Estoque invalido."),
});

const updateProductSchema = z.object({
  categoryId: z.string().min(1, "Categoria e obrigatoria."),
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nome e obrigatorio."),
});

const stockAdditionSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantidade invalida."),
  stockedOn: z.string().min(1, "Data de abastecimento invalida."),
  unitCost: z.coerce.number().min(0, "Custo invalido."),
});

const revalidateProducts = () => {
  revalidatePath("/produtos");
  revalidatePath("/configuracoes");
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
  id: string;
  productId: string;
  quantity: number;
  stockedOn: string;
  unitCost: string;
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

export async function createProductAction(data: {
  categoryId: string;
  costPrice: string;
  description?: string;
  name: string;
  price: string;
  purchasedOn: string;
  stock: number;
}) {
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
  const parsed = stockAdditionSchema.parse(data);
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
  });

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  const nextCostPrice = calculateWeightedCostPrice({
    currentCostPrice: Number(product.costPrice),
    currentStock: Number(product.stock),
    incomingQuantity: parsed.quantity,
    incomingUnitCost: parsed.unitCost,
  });

  await db.transaction(async (tx) => {
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
        costPrice: nextCostPrice.toFixed(2),
        stock: Number(product.stock) + parsed.quantity,
      })
      .where(eq(products.id, id));
  });

  revalidateProducts();
}

export async function archiveProductAction(id: string) {
  await db
    .update(products)
    .set({
      archivedAt: new Date(),
    })
    .where(eq(products.id, id));

  revalidateProducts();
}

export async function unarchiveProductAction(id: string) {
  await db
    .update(products)
    .set({
      archivedAt: null,
    })
    .where(eq(products.id, id));

  revalidateProducts();
}

export async function deleteProductAction(id: string) {
  await db.delete(products).where(eq(products.id, id));
  revalidateProducts();
}
