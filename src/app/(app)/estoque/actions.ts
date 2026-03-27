"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import { createInventoryAdjustment } from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const inventorySchema = z.object({
  note: z.string().trim().max(2000).optional(),
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  type: z.enum([
    "purchase_in",
    "adjustment_plus",
    "adjustment_minus",
    "damage",
    "loss",
  ]),
  unitCost: z.coerce.number().min(0).optional(),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/estoque", params));

export async function createInventoryAdjustmentAction(formData: FormData) {
  const session = await requireSession();
  const parsed = inventorySchema.safeParse({
    note: formData.get("note") ?? "",
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    type: formData.get("type"),
    unitCost: formData.get("unitCost") ?? undefined,
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os dados do ajuste antes de salvar.",
    });
  }

  try {
    await createInventoryAdjustment(parsed.data, session.user.id);
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar o movimento de estoque.",
    });
  }

  revalidatePath("/");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  return redirectWithResult({
    message: "Movimento de estoque registrado.",
  });
}
