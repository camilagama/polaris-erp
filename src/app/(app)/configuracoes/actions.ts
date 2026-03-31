"use server";

import { revalidatePath } from "next/cache";
import {
  createCategory,
  deleteCategory,
  saveCatalogSettings,
  updateCategory,
} from "@/features/catalog/server";

const revalidateCatalogViews = () => {
  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
};

export async function createCategoryAction(data: {
  description?: string;
  name: string;
}) {
  await createCategory(data);
  revalidateCatalogViews();
}

export async function updateCategoryAction(
  id: string,
  data: { description?: string; name: string }
) {
  await updateCategory(id, data);
  revalidateCatalogViews();
}

export async function deleteCategoryAction(id: string) {
  await deleteCategory(id);
  revalidateCatalogViews();
}

export async function saveCatalogSettingsAction(data: {
  idealMarkupPercent: number;
  minimumMarkupPercent: number;
}) {
  await saveCatalogSettings(data);
  revalidateCatalogViews();
}
