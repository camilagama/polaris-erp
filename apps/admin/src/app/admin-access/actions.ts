"use server";

import {
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

export async function grantPlatformAdminAccessAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "owner" });
  const expiresAt = getFutureExpiration(formData);
  const reason = getRequiredFormValue(formData, "reason");
  const role = getGrantRole(formData);
  const targetUserId = getRequiredFormValue(formData, "targetUserId");

  await assertAdminRateLimit({
    action: "platform-admin.grant",
    actorUserId: context.userId,
    targetId: targetUserId,
  });

  await grantPlatformAdminAccess({
    actorPlatformAdminId: context.platformAdminId,
    actorUserId: context.userId,
    expiresAt,
    reason,
    role,
    targetUserId,
  });
  revalidatePath("/admin-access");
}

export async function revokePlatformAdminGrantAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "owner" });
  const grantId = getRequiredFormValue(formData, "grantId");
  const reason = getRequiredFormValue(formData, "reason");

  await assertAdminRateLimit({
    action: "platform-admin.grant-revoke",
    actorUserId: context.userId,
    targetId: grantId,
  });

  await revokePlatformAdminGrant({
    actorPlatformAdminId: context.platformAdminId,
    actorUserId: context.userId,
    grantId,
    reason,
  });
  revalidatePath("/admin-access");
}
