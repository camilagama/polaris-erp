"use server";

import {
  createPlatformSupportCase,
  updatePlatformSupportCase,
} from "@polaris/platform/support-cases";
import { assertAdminRateLimit } from "@polaris/platform-auth/admin-rate-limit";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

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

const getCaseKind = (
  formData: FormData
): "data_subject_request" | "support" => {
  const kind = getRequiredFormValue(formData, "kind");

  if (kind === "data_subject_request" || kind === "support") {
    return kind;
  }

  throw new Error("Unsupported support case kind.");
};

const getCaseStatus = (formData: FormData): "closed" | "in_review" => {
  const status = getRequiredFormValue(formData, "status");

  if (status === "in_review" || status === "closed") {
    return status;
  }

  throw new Error("Unsupported support case status.");
};

export async function createSupportCaseAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "support" });
  const customerUserId = getOptionalFormValue(formData, "customerUserId");
  const kind = getCaseKind(formData);
  const organizationId = getOptionalFormValue(formData, "organizationId");
  const reason = getRequiredFormValue(formData, "reason");
  const targetId = organizationId ?? customerUserId;

  if (!targetId) {
    throw new Error("Missing required case target.");
  }

  await assertAdminRateLimit({
    action: "support-case.create",
    actorUserId: context.userId,
    targetId,
  });

  await createPlatformSupportCase({
    createdByPlatformAdminId: context.platformAdminId,
    customerUserId,
    kind,
    organizationId,
    reason,
  });

  if (organizationId) {
    revalidatePath(`/organizations/${organizationId}`);
  }

  if (customerUserId) {
    revalidatePath(`/users/${customerUserId}`);
  }
}

export async function updateSupportCaseAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "support" });
  const caseId = getRequiredFormValue(formData, "caseId");
  const status = getCaseStatus(formData);
  const requesterVerified = formData.get("requesterVerified") === "on";
  const resolution = getOptionalFormValue(formData, "resolution");

  if (status === "closed" && !resolution) {
    throw new Error("Missing required field: resolution");
  }

  await assertAdminRateLimit({
    action: "support-case.update",
    actorUserId: context.userId,
    targetId: caseId,
  });

  await updatePlatformSupportCase({
    actorPlatformAdminId: context.platformAdminId,
    caseId,
    requesterVerified,
    resolution,
    status,
  });

  const organizationId = getOptionalFormValue(formData, "organizationId");
  const customerUserId = getOptionalFormValue(formData, "customerUserId");

  if (organizationId) {
    revalidatePath(`/organizations/${organizationId}`);
  }

  if (customerUserId) {
    revalidatePath(`/users/${customerUserId}`);
  }
}
