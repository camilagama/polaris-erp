"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { createPlatformSupportNote } from "@/lib/platform-support-notes";

const getOptionalFormValue = (
  formData: FormData,
  key: string
): string | null => {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const getRequiredFormValue = (formData: FormData, key: string): string => {
  const value = getOptionalFormValue(formData, key);

  if (!value) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value;
};

export async function createSupportNoteAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "support" });
  const body = getRequiredFormValue(formData, "body");
  const organizationId = getOptionalFormValue(formData, "organizationId");
  const customerUserId = getOptionalFormValue(formData, "customerUserId");

  await createPlatformSupportNote({
    authorPlatformAdminId: context.platformAdminId,
    body,
    customerUserId,
    organizationId,
  });

  if (organizationId) {
    revalidatePath(`/organizations/${organizationId}`);
  }

  if (customerUserId) {
    revalidatePath(`/users/${customerUserId}`);
  }
}
