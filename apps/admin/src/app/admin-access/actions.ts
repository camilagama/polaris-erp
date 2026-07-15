"use server";

import {
  createPlatformAdminEnrollment,
  grantPlatformAdminAccess,
  revokePlatformAdminGrant,
} from "@polaris/platform/admin";
import { assertAdminRateLimit } from "@polaris/platform-auth/admin-rate-limit";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

const getRequiredFormValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  if (!(typeof value === "string" && value.trim())) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
};

const getGrantRole = (formData: FormData): "operator" | "owner" | "support" => {
  const role = getRequiredFormValue(formData, "role");

  if (role === "owner" || role === "operator" || role === "support") {
    return role;
  }

  throw new Error("Unsupported platform admin role.");
};

const getFutureExpiration = (formData: FormData): Date => {
  const expiresAt = new Date(getRequiredFormValue(formData, "expiresAt"));

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("Platform admin grant requires a future expiration.");
  }

  return expiresAt;
};

const getEnrollmentExpiration = (): Date => {
  const expiration = new Date();

  expiration.setDate(expiration.getDate() + 7);
  return expiration;
};

export async function createPlatformAdminEnrollmentAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "owner" });
  const email = getRequiredFormValue(formData, "email");
  const grantExpiresAt = getFutureExpiration(formData);
  const reason = getRequiredFormValue(formData, "reason");
  const role = getGrantRole(formData);

  await assertAdminRateLimit({
    action: "platform-admin.enrollment-create",
    actorAdminUserId: context.adminUserId,
    targetId: email.toLowerCase(),
  });
  await createPlatformAdminEnrollment({
    actorAdminUserId: context.adminUserId,
    actorPlatformAdminId: context.platformAdminId,
    email,
    enrollmentExpiresAt: getEnrollmentExpiration(),
    grantExpiresAt,
    reason,
    role,
  });
  revalidatePath("/admin-access");
}

export async function grantPlatformAdminAccessAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "owner" });
  const expiresAt = getFutureExpiration(formData);
  const reason = getRequiredFormValue(formData, "reason");
  const role = getGrantRole(formData);
  const targetAdminUserId = getRequiredFormValue(formData, "targetAdminUserId");

  await assertAdminRateLimit({
    action: "platform-admin.grant",
    actorAdminUserId: context.adminUserId,
    targetId: targetAdminUserId,
  });

  await grantPlatformAdminAccess({
    actorPlatformAdminId: context.platformAdminId,
    actorAdminUserId: context.adminUserId,
    expiresAt,
    reason,
    role,
    targetAdminUserId,
  });
  revalidatePath("/admin-access");
}

export async function revokePlatformAdminGrantAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "owner" });
  const grantId = getRequiredFormValue(formData, "grantId");
  const reason = getRequiredFormValue(formData, "reason");

  await assertAdminRateLimit({
    action: "platform-admin.grant-revoke",
    actorAdminUserId: context.adminUserId,
    targetId: grantId,
  });

  await revokePlatformAdminGrant({
    actorPlatformAdminId: context.platformAdminId,
    actorAdminUserId: context.adminUserId,
    grantId,
    reason,
  });
  revalidatePath("/admin-access");
}
