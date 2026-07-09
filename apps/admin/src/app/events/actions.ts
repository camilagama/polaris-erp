"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { retryOutboxEvent } from "@/lib/event-foundation";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

const getRequiredFormValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
};

export async function retryOutboxEventAction(formData: FormData) {
  await requirePlatformAdmin({ minimumRole: "operator" });
  const eventId = getRequiredFormValue(formData, "eventId");

  await retryOutboxEvent(db, eventId);
  revalidatePath("/events");
}
