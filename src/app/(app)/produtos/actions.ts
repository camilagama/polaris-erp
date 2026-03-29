"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { products } from "@/db/schema";

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
  await db.insert(products).values({
    ...data,
  });

  revalidatePath("/produtos");
}
