"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import { upsertSystemSettings } from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const settingsSchema = z.object({
  estimatedFeePercent: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
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
    lowStockThreshold: formData.get("lowStockThreshold"),
    minimumMarginPercent: formData.get("minimumMarginPercent"),
    staleProductDays: formData.get("staleProductDays"),
    targetMarginPercent: formData.get("targetMarginPercent"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os parametros antes de salvar.",
    });
  }

  await upsertSystemSettings(parsed.data);

  revalidatePath("/");
  revalidatePath("/estoque");
  revalidatePath("/configuracoes");
  return redirectWithResult({
    message: "Configuracoes atualizadas.",
  });
}
