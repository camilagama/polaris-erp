"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import { cancelSale, createSale } from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const moneyField = z.coerce.number().min(0);

const saleSchema = z.object({
  channel: z.string().trim().min(2).max(80),
  discountAmount: moneyField,
  notes: z.string().trim().max(2000).optional(),
  shippingChargedAmount: moneyField,
});

const saleIdSchema = z.object({
  saleId: z.coerce.number().int().positive(),
});

const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitSalePrice: moneyField,
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/vendas", params));

const parseSaleItems = (formData: FormData) => {
  const items: z.infer<typeof saleItemSchema>[] = [];

  for (const index of [1, 2, 3, 4]) {
    const productIdValue = String(
      formData.get(`item_product_${index}`) ?? ""
    ).trim();
    const quantityValue = String(
      formData.get(`item_quantity_${index}`) ?? ""
    ).trim();
    const priceValue = String(formData.get(`item_price_${index}`) ?? "").trim();

    if (!(productIdValue && quantityValue && priceValue)) {
      continue;
    }

    const parsedItem = saleItemSchema.safeParse({
      productId: productIdValue,
      quantity: quantityValue,
      unitSalePrice: priceValue,
    });

    if (!parsedItem.success) {
      throw new Error(`Revise o item ${index} da venda.`);
    }

    items.push(parsedItem.data);
  }

  if (items.length === 0) {
    throw new Error("Adicione ao menos um item na venda.");
  }

  return items;
};

export async function createSaleAction(formData: FormData) {
  const session = await requireSession();
  const parsedSale = saleSchema.safeParse({
    channel: formData.get("channel"),
    discountAmount: formData.get("discountAmount") ?? 0,
    notes: formData.get("notes") ?? "",
    shippingChargedAmount: formData.get("shippingChargedAmount") ?? 0,
  });

  if (!parsedSale.success) {
    return redirectWithResult({
      error: "Revise os dados gerais da venda.",
    });
  }

  try {
    const items = parseSaleItems(formData);

    await createSale(
      {
        ...parsedSale.data,
        items,
      },
      session.user.id
    );
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar a venda.",
    });
  }

  revalidatePath("/");
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  return redirectWithResult({
    message: "Venda registrada com snapshot de custo e baixa no estoque.",
  });
}

export async function cancelSaleAction(formData: FormData) {
  const session = await requireSession();
  const parsed = saleIdSchema.safeParse({
    saleId: formData.get("saleId"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Venda invalida.",
    });
  }

  try {
    await cancelSale(parsed.data.saleId, session.user.id);
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel cancelar a venda.",
    });
  }

  revalidatePath("/");
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  return redirectWithResult({
    message: "Venda cancelada e estoque recomposto.",
  });
}
