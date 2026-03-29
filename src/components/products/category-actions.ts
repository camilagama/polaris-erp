"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories } from "@/db/schema";

export async function getCategoriesAction() {
  return await db.query.categories.findMany({
    orderBy: [asc(categories.name)],
  });
}

export async function createCategoryAction(data: {
  name: string;
  description?: string;
}) {
  await db.insert(categories).values(data);
  revalidatePath("/produtos");
}

export async function updateCategoryAction(
  id: string,
  data: { name: string; description?: string }
) {
  await db.update(categories).set(data).where(eq(categories.id, id));
  revalidatePath("/produtos");
}

export async function deleteCategoryAction(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/produtos");
}
