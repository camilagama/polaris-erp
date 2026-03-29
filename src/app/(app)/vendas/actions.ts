"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import { cancelSale, createSale } from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const moneyField = z.coerce.number().min(0);
const paymentMethodSchema = z.enum([
  "pix",
  "cash",
  "card_debit",
  "card_credit",
  "payment_link",
  "bank_transfer",
  "other",
]);
const paymentStatusSchema = z.enum(["pending", "confirmed"]);

const saleSchema = z.object({
  channel: z.string().trim().min(2).max(80),
  discountAmount: moneyField,
  notes: z.string().trim().max(2000).optional(),
  saleDate: z.string().optional(),
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
const salePaymentSchema = z.object({
  dueDate: z.string().optional(),
  effectiveDate: z.string().optional(),
  feeAmount: moneyField,
  grossAmount: z.coerce.number().positive(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/vendas", params));

const toOptionalDate = (value?: string) => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
};

interface ParsedSalePayment {
  dueDate: Date | null;
  effectiveDate: Date | null;
  feeAmount: number;
  grossAmount: number;
  method: z.infer<typeof paymentMethodSchema>;
  status: z.infer<typeof paymentStatusSchema>;
}

const parseSaleItems = (formData: FormData) => {
  const items: z.infer<typeof saleItemSchema>[] = [];
  const productIds = formData.getAll("itemProductId");
  const quantities = formData.getAll("itemQuantity");
  const prices = formData.getAll("itemPrice");

  for (const [index, productId] of productIds.entries()) {
    const productIdValue = String(productId ?? "").trim();
    const quantityValue = String(quantities[index] ?? "").trim();
    const priceValue = String(prices[index] ?? "").trim();

    const parsedItem = saleItemSchema.safeParse({
      productId: productIdValue,
      quantity: quantityValue,
      unitSalePrice: priceValue,
    });

    if (!parsedItem.success) {
      throw new Error(`Revise o item ${index + 1} da venda.`);
    }

    items.push(parsedItem.data);
  }

  if (items.length === 0) {
    throw new Error("Adicione ao menos um item na venda.");
  }

  return items;
};

const parseSalePayments = (formData: FormData) => {
  const payments: ParsedSalePayment[] = [];
  const grossAmounts = formData.getAll("paymentGrossAmount");
  const feeAmounts = formData.getAll("paymentFeeAmount");
  const methods = formData.getAll("paymentMethod");
  const statuses = formData.getAll("paymentStatus");
  const dueDates = formData.getAll("paymentDueDate");
  const effectiveDates = formData.getAll("paymentEffectiveDate");

  for (const [index, grossAmount] of grossAmounts.entries()) {
    const grossAmountValue = String(grossAmount ?? "").trim();

    if (!grossAmountValue) {
      continue;
    }

    const parsedPayment = salePaymentSchema.safeParse({
      dueDate: String(dueDates[index] ?? "").trim(),
      effectiveDate: String(effectiveDates[index] ?? "").trim(),
      feeAmount: String(feeAmounts[index] ?? "0").trim(),
      grossAmount: grossAmountValue,
      method: String(methods[index] ?? "").trim(),
      status: String(statuses[index] ?? "").trim(),
    });

    if (!parsedPayment.success) {
      throw new Error(`Revise o pagamento ${index + 1} da venda.`);
    }

    payments.push({
      dueDate: toOptionalDate(parsedPayment.data.dueDate),
      effectiveDate: toOptionalDate(parsedPayment.data.effectiveDate),
      feeAmount: parsedPayment.data.feeAmount,
      grossAmount: parsedPayment.data.grossAmount,
      method: parsedPayment.data.method,
      status: parsedPayment.data.status,
    });
  }

  return payments;
};

export async function createSaleAction(formData: FormData) {
  const session = await requireSession();
  const parsedSale = saleSchema.safeParse({
    channel: formData.get("channel"),
    discountAmount: formData.get("discountAmount") ?? 0,
    notes: formData.get("notes") ?? "",
    saleDate: formData.get("saleDate") ?? "",
    shippingChargedAmount: formData.get("shippingChargedAmount") ?? 0,
  });

  if (!parsedSale.success) {
    return redirectWithResult({
      error: "Revise os dados gerais da venda.",
    });
  }

  try {
    const items = parseSaleItems(formData);
    const payments = parseSalePayments(formData);

    await createSale(
      {
        ...parsedSale.data,
        items,
        payments,
        saleDate: toOptionalDate(parsedSale.data.saleDate),
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
