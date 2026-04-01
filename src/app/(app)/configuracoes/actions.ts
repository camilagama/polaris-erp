"use server";

import { refresh } from "next/cache";
import type {
  CatalogSettingsInput,
  CategoryInput,
} from "@/features/catalog/schema";
import {
  createCategory,
  deleteCategory,
  saveCatalogSettings,
  updateCategory,
} from "@/features/catalog/server";
import { requireActionSession } from "@/lib/server-action-auth";

const revalidateCatalogViews = () => {
  refresh();
};

export async function createCategoryAction(data: CategoryInput) {
  await requireActionSession();
  await createCategory(data);
  revalidateCatalogViews();
}

export async function updateCategoryAction(id: string, data: CategoryInput) {
  await requireActionSession();
  await updateCategory(id, data);
  revalidateCatalogViews();
}

export async function deleteCategoryAction(id: string) {
  await requireActionSession();
  await deleteCategory(id);
  revalidateCatalogViews();
}

export async function saveCatalogSettingsAction(data: CatalogSettingsInput) {
  await requireActionSession();
  await saveCatalogSettings(data);
  revalidateCatalogViews();
}
