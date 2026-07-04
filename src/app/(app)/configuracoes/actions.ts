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
import { recordAuditEvent } from "@/lib/audit-log";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

const revalidateCatalogViews = (organizationId: string) => {
  updateTag(buildOrganizationCacheTags(organizationId).catalog);
  refresh();
};

export async function createCategoryAction(data: CategoryInput) {
  const context = await requireAppContext("settings:write");
  await createCategory(context.organizationId, data);
  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    metadata: { name: data.name },
    subjectType: "category",
    type: "category.created",
  });
}

export async function updateCategoryAction(id: string, data: CategoryInput) {
  const context = await requireAppContext("settings:write");
  await updateCategory(context.organizationId, id, data);
  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    metadata: { name: data.name },
    subjectId: id,
    subjectType: "category",
    type: "category.updated",
  });
}

export async function deleteCategoryAction(id: string) {
  const context = await requireAppContext("settings:write");
  await deleteCategory(context.organizationId, id);
  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    subjectId: id,
    subjectType: "category",
    type: "category.deleted",
  });
}

export async function saveCatalogSettingsAction(data: CatalogSettingsInput) {
  const context = await requireAppContext("settings:write");
  await saveCatalogSettings(context.organizationId, data);
  revalidateCatalogViews(context.organizationId);
  await recordAuditEvent({
    context,
    subjectType: "settings",
    type: "settings.updated",
  });
}
