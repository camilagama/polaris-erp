"use server";

import { revalidatePath } from "next/cache";
import {
  createCategory,
  deleteCategory,
  saveCatalogSettings,
  updateCategory,
} from "@/features/catalog/server";
import { requireActionSession } from "@/lib/server-action-auth";

const revalidateCatalogViews = () => {
  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
};

export async function createCategoryAction(data: {
  description?: string;
  name: string;
}) {
  await requireActionSession();
  await createCategory(data);
  revalidateCatalogViews();
}

export async function updateCategoryAction(
  id: string,
  data: { description?: string; name: string }
) {
  await requireActionSession();
  await updateCategory(id, data);
  revalidateCatalogViews();
}

export async function deleteCategoryAction(id: string) {
  await requireActionSession();
  await deleteCategory(id);
  revalidateCatalogViews();
}

export async function saveCatalogSettingsAction(data: {
  idealMarkupPercent: number;
  minimumMarkupPercent: number;
}) {
  await requireActionSession();
  await saveCatalogSettings(data);
  revalidateCatalogViews();
}
