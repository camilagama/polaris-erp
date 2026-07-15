"use server";

import { updatePlatformBillingSubscriptionStatus } from "@polaris/platform/billing";
import { assertAdminRateLimit } from "@polaris/platform-auth/admin-rate-limit";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

type BillingSubscriptionStatusChange = "active" | "past_due";

const isBillingSubscriptionStatusChange = (
  value: string
): value is BillingSubscriptionStatusChange =>
  value === "active" || value === "past_due";

const getRequiredFormValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
};

export async function changeBillingSubscriptionStatusAction(
  formData: FormData
) {
  const context = await requirePlatformAdmin({ minimumRole: "operator" });
  const subscriptionId = getRequiredFormValue(formData, "subscriptionId");
  const status = getRequiredFormValue(formData, "status");
  const reason = getRequiredFormValue(formData, "reason");
  const confirm = formData.get("confirm");

  if (!isBillingSubscriptionStatusChange(status)) {
    throw new Error("Unsupported billing subscription status.");
  }

  if (confirm !== "on") {
    throw new Error(
      "Billing subscription status change requires confirmation."
    );
  }

  const paymentEvidenceReference =
    status === "active"
      ? getRequiredFormValue(formData, "paymentEvidenceReference")
      : undefined;

  await assertAdminRateLimit({
    action: "billing.subscription.status.change",
    actorAdminUserId: context.adminUserId,
    targetId: subscriptionId,
  });

  await updatePlatformBillingSubscriptionStatus({
    actorPlatformAdminId: context.platformAdminId,
    actorAdminUserId: context.adminUserId,
    paymentEvidenceReference,
    reason,
    status,
    subscriptionId,
  });

  revalidatePath("/billing");
}
