"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import { cancelPurchase, createPurchase } from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const createPurchaseSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
  purchaseDate: z.string().optional(),
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  supplierAmount: z.coerce.number().min(0),
});

const purchaseIdSchema = z.object({
  purchaseId: z.coerce.number().int().positive(),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/produtos", params));

const toOptionalDate = (value?: string) => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
};

export async function createPurchaseAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createPurchaseSchema.safeParse({
    notes: formData.get("notes") ?? "",
    purchaseDate: formData.get("purchaseDate") ?? "",
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    supplierAmount: formData.get("supplierAmount"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os dados da compra antes de salvar.",
    });
  }

  try {
    await createPurchase(
      {
        ...parsed.data,
        purchaseDate: toOptionalDate(parsed.data.purchaseDate),
      },
      session.user.id
    );
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a compra.",
    });
  }

  revalidatePath("/");
  revalidatePath("/produtos");

  return redirectWithResult({
    message: "Entrada registrada e estoque atualizado.",
  });
}

export async function cancelPurchaseAction(formData: FormData) {
  await requireSession();
  const parsed = purchaseIdSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Compra ou entrada invalida.",
    });
  }

  try {
    await cancelPurchase(parsed.data.purchaseId);
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error ? error.message : "Nao foi possivel cancelar.",
    });
  }

  revalidatePath("/");
  revalidatePath("/produtos");
  return redirectWithResult({
    message: "Operacao cancelada.",
  });
}
