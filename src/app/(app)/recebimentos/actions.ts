"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildRedirectPath } from "@/lib/action-feedback";
import { createPaymentEvent } from "@/lib/domain/operations";
import { requireSession } from "@/lib/session";

const paymentEventSchema = z.object({
  dueDate: z.string().optional(),
  effectiveDate: z.string().optional(),
  feeAmount: z.coerce.number().min(0),
  grossAmount: z.coerce.number().positive(),
  method: z.enum([
    "pix",
    "cash",
    "card_debit",
    "card_credit",
    "payment_link",
    "bank_transfer",
    "other",
  ]),
  notes: z.string().trim().max(2000).optional(),
  saleId: z.coerce.number().int().positive(),
  status: z.enum(["pending", "confirmed", "canceled"]),
  type: z.enum(["payment", "refund", "chargeback"]),
});

const redirectWithResult = (params: Record<string, string | undefined>) =>
  redirect(buildRedirectPath("/vendas", params));

const toOptionalDate = (value?: string) => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
};

export async function createReceiptAction(formData: FormData) {
  const session = await requireSession();
  const parsed = paymentEventSchema.safeParse({
    dueDate: formData.get("dueDate") ?? "",
    effectiveDate: formData.get("effectiveDate") ?? "",
    feeAmount: formData.get("feeAmount") ?? 0,
    grossAmount: formData.get("grossAmount"),
    method: formData.get("method"),
    notes: formData.get("notes") ?? "",
    saleId: formData.get("saleId"),
    status: formData.get("status"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return redirectWithResult({
      error: "Revise os campos do recebimento.",
    });
  }

  try {
    await createPaymentEvent(
      {
        ...parsed.data,
        dueDate: toOptionalDate(parsed.data.dueDate),
        effectiveDate: toOptionalDate(parsed.data.effectiveDate),
      },
      session.user.id
    );
  } catch (error) {
    return redirectWithResult({
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar o recebimento.",
    });
  }

  revalidatePath("/");
  revalidatePath("/vendas");
  revalidatePath("/recebimentos");
  return redirectWithResult({
    message: "Evento financeiro registrado e venda recalculada.",
  });
}
