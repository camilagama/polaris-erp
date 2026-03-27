"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import {
  cancelPurchase,
  createPurchase,
  receivePurchase,
} from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const createPurchaseSchema = z.object({
  cardFeeAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
  otherCostsAmount: z.coerce.number().min(0).optional(),
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  shippingAmount: z.coerce.number().min(0).optional(),
  status: z.enum(["draft", "registered"]),
  supplierAmount: z.coerce.number().min(0),
});

const purchaseIdSchema = z.object({
  purchaseId: z.coerce.number().int().positive(),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/compras", params));

export async function createPurchaseAction(formData: FormData) {
  const session = await requireSession();
  const parsed = createPurchaseSchema.safeParse({
    cardFeeAmount: formData.get("cardFeeAmount") ?? 0,
    notes: formData.get("notes") ?? "",
    otherCostsAmount: formData.get("otherCostsAmount") ?? 0,
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    shippingAmount: formData.get("shippingAmount") ?? 0,
    status: formData.get("status"),
    supplierAmount: formData.get("supplierAmount"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os dados da compra antes de salvar.",
    });
  }

  try {
    await createPurchase(parsed.data, session.user.id);
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a compra.",
    });
  }

  revalidatePath("/");
  revalidatePath("/compras");
  return redirectWithResult({
    message: "Compra registrada.",
  });
}

export async function receivePurchaseAction(formData: FormData) {
  const session = await requireSession();
  const parsed = purchaseIdSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Compra invalida.",
    });
  }

  try {
    await receivePurchase(parsed.data.purchaseId, session.user.id);
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel receber a compra.",
    });
  }

  revalidatePath("/");
  revalidatePath("/compras");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  return redirectWithResult({
    message: "Compra recebida e integrada ao estoque.",
  });
}

export async function cancelPurchaseAction(formData: FormData) {
  await requireSession();
  const parsed = purchaseIdSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Compra invalida.",
    });
  }

  try {
    await cancelPurchase(parsed.data.purchaseId);
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel cancelar a compra.",
    });
  }

  revalidatePath("/compras");
  return redirectWithResult({
    message: "Compra cancelada.",
  });
}
