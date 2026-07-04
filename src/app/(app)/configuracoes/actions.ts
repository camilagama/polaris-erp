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
import {
  cancelOrganizationInvitation,
  inviteOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/features/organization/server";
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

export async function inviteOrganizationMemberAction(data: unknown) {
  const context = await requireAppContext("members:write");
  return inviteOrganizationMember(context, data);
}

export async function cancelOrganizationInvitationAction(data: unknown) {
  const context = await requireAppContext("members:write");
  await cancelOrganizationInvitation(context, data);
  refresh();
}

export async function updateOrganizationMemberRoleAction(data: unknown) {
  const context = await requireAppContext("members:write");
  await updateOrganizationMemberRole(context, data);
  refresh();
}

export async function removeOrganizationMemberAction(data: unknown) {
  const context = await requireAppContext("members:write");
  await removeOrganizationMember(context, data);
  refresh();
}
