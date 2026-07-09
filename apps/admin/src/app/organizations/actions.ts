"use server";

import { updatePlatformOrganizationStatus } from "@polaris/platform/organization-mutations";
import { assertAdminRateLimit } from "@polaris/platform-auth/admin-rate-limit";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

type OrganizationStatusChange = "active" | "suspended";

const isOrganizationStatusChange = (
  value: string
): value is OrganizationStatusChange =>
  value === "active" || value === "suspended";

const getRequiredFormValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
};

export async function changeOrganizationStatusAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "operator" });
  const organizationId = getRequiredFormValue(formData, "organizationId");
  const status = getRequiredFormValue(formData, "status");
  const reason = getRequiredFormValue(formData, "reason");
  const confirm = formData.get("confirm");

  if (!isOrganizationStatusChange(status)) {
    throw new Error("Unsupported organization status.");
  }

  if (confirm !== "on") {
    throw new Error("Organization status change requires confirmation.");
  }

  await assertAdminRateLimit({
    action: "organization.status.change",
    actorUserId: context.userId,
    targetId: organizationId,
  });

  await updatePlatformOrganizationStatus({
    actorPlatformAdminId: context.platformAdminId,
    actorUserId: context.userId,
    organizationId,
    reason,
    status,
  });

  revalidatePath("/organizations");
  revalidatePath(`/organizations/${organizationId}`);
}
