"use server";

import { refresh, updateTag } from "next/cache";
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
import { requireAppContext } from "@/lib/app-session";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

const revalidateCatalogViews = (organizationId: string) => {
  updateTag(buildOrganizationCacheTags(organizationId).catalog);
  refresh();
};

export async function createCategoryAction(data: CategoryInput) {
  const context = await requireAppContext("settings:write");
  await createCategory(context.organizationId, context.userId, data);
  revalidateCatalogViews(context.organizationId);
}

export async function updateCategoryAction(id: string, data: CategoryInput) {
  const context = await requireAppContext("settings:write");
  await updateCategory(context.organizationId, context.userId, id, data);
  revalidateCatalogViews(context.organizationId);
}

export async function deleteCategoryAction(id: string) {
  const context = await requireAppContext("settings:write");
  await deleteCategory(context.organizationId, context.userId, id);
  revalidateCatalogViews(context.organizationId);
}

export async function saveCatalogSettingsAction(data: CatalogSettingsInput) {
  const context = await requireAppContext("settings:write");
  await saveCatalogSettings(context.organizationId, context.userId, data);
  revalidateCatalogViews(context.organizationId);
}
