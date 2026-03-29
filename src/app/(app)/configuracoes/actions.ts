"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { buildRedirectPath } from "@/lib/action-feedback";
import { requireSession } from "@/lib/session";

const settingsSchema = z.object({
  estimatedFeePercent: z.coerce.number().min(0),
  minimumMarginPercent: z.coerce.number().min(0),
  staleProductDays: z.coerce.number().int().min(1),
  targetMarginPercent: z.coerce.number().min(0),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/configuracoes", params));

export async function saveSettingsAction(formData: FormData) {
  await requireSession();
  const parsed = settingsSchema.safeParse({
    estimatedFeePercent: formData.get("estimatedFeePercent"),
    minimumMarginPercent: formData.get("minimumMarginPercent"),
    staleProductDays: formData.get("staleProductDays"),
    targetMarginPercent: formData.get("targetMarginPercent"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os parametros antes de salvar.",
    });
  }

  const values = {
    estimatedFeePercent: String(parsed.data.estimatedFeePercent),
    minimumMarginPercent: String(parsed.data.minimumMarginPercent),
    staleProductDays: parsed.data.staleProductDays,
    targetMarginPercent: String(parsed.data.targetMarginPercent),
  };

  const existing = await db.select().from(systemSettings).limit(1);

  if (existing.length > 0) {
    await db.update(systemSettings).set({ ...values, updatedAt: new Date() });
  } else {
    await db.insert(systemSettings).values(values);
  }

  revalidatePath("/configuracoes");
  return redirectWithResult({ message: "Configuracoes atualizadas." });
}
