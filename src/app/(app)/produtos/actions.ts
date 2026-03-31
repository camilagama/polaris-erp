"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getProductCategoryById } from "@/features/catalog/server";

const productSchema = z.object({
  categoryId: z.string().min(1, "Categoria e obrigatoria."),
  costPrice: z.coerce.number().min(0, "Custo invalido."),
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nome e obrigatorio."),
  price: z.coerce.number().min(0, "Preco invalido."),
  stock: z.coerce.number().int().min(0, "Estoque invalido."),
});

export async function getProductsAction() {
  return await db.select().from(products);
}

export async function createProductAction(data: {
  name: string;
  categoryId: string;
  description?: string;
  costPrice: string;
  price: string;
  stock: number;
}) {
  const parsed = productSchema.parse(data);
  const category = await getProductCategoryById(parsed.categoryId);

  if (!category) {
    throw new Error("Selecione uma categoria valida.");
  }

  await db.insert(products).values({
    categoryId: parsed.categoryId,
    costPrice: parsed.costPrice.toFixed(2),
    description: parsed.description || undefined,
    name: parsed.name,
    price: parsed.price.toFixed(2),
    stock: parsed.stock,
  });

  revalidatePath("/produtos");
}
