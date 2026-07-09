"use server";

import { db } from "@polaris/db";
import { retryOutboxEvent } from "@polaris/events";
import { revalidatePath } from "next/cache";
import { assertAdminRateLimit } from "@/lib/admin-rate-limit";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

const getRequiredFormValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
};

export async function retryOutboxEventAction(formData: FormData) {
  const context = await requirePlatformAdmin({ minimumRole: "operator" });
  const eventId = getRequiredFormValue(formData, "eventId");

  await assertAdminRateLimit({
    action: "outbox.retry",
    actorUserId: context.userId,
    targetId: eventId,
  });

  await retryOutboxEvent(db, eventId);
  revalidatePath("/events");
}
