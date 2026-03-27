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
    "adjustment_plus",
    "adjustment_minus",
    "customer_return",
    "damage",
    "loss",
  ]),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/produtos", params));

export async function createInventoryAdjustmentAction(formData: FormData) {
  const session = await requireSession();
  const parsed = inventorySchema.safeParse({
    note: formData.get("note") ?? "",
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    type: formData.get("type"),
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
  revalidatePath("/produtos");
  revalidatePath("/vendas");
  return redirectWithResult({
    message: "Movimento de estoque registrado.",
  });
}
