import { z } from "zod";
import { isoDateSchema } from "@/lib/domain/date";

const salePaymentMethodValues = ["card", "pix"] as const;
const salePaymentFeePayerValues = [
  "customer",
  "not_applicable",
  "seller",
] as const;

const saleItemSchema = z.object({
  expectedUnitPrice: z.coerce.number().min(0, "Preco esperado invalido."),
  productId: z.string().min(1, "Produto invalido."),
  quantity: z.coerce
    .number()
    .int("Quantidade deve ser um numero inteiro.")
    .min(1, "Quantidade deve ser maior que zero."),
});

export const createSaleSchema = z
  .object({
    additionalAmount: z.coerce
      .number()
      .min(0, "Adicional nao pode ser negativo.")
      .default(0),
    customerName: z.string().trim().max(80).optional(),
    discountAmount: z.coerce
      .number()
      .min(0, "Desconto nao pode ser negativo.")
      .default(0),
    freightAmount: z.coerce
      .number()
      .min(0, "Frete nao pode ser negativo.")
      .default(0),
    idempotencyKey: z.string().uuid("Chave de venda invalida.").optional(),
    items: z
      .array(saleItemSchema)
      .min(1, "Adicione pelo menos um item na venda."),
    notes: z.string().trim().max(240).optional(),
    occurredOn: isoDateSchema,
    paymentFeePayer: z.enum(salePaymentFeePayerValues, {
      error: "Responsavel pela taxa invalido.",
    }),
    paymentInstallments: z.coerce
      .number()
      .int("Parcelas devem ser um numero inteiro.")
      .min(0, "Parcelas nao pode ser negativo."),
    paymentMethod: z.enum(salePaymentMethodValues, {
      error: "Metodo de pagamento invalido.",
    }),
  })
  .superRefine((value, context) => {
    const seenProductIds = new Set<string>();

    for (const [index, item] of value.items.entries()) {
      if (seenProductIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          message: "Nao repita o mesmo produto na venda.",
          path: ["items", index, "productId"],
        });
      }

      seenProductIds.add(item.productId);
    }

    if (value.paymentMethod === "pix") {
      if (value.paymentInstallments !== 0) {
        context.addIssue({
          code: "custom",
          message: "Pix nao aceita parcelamento.",
          path: ["paymentInstallments"],
        });
      }

      if (value.paymentFeePayer !== "not_applicable") {
        context.addIssue({
          code: "custom",
          message: "Pix nao possui responsavel por taxa.",
          path: ["paymentFeePayer"],
        });
      }

      return;
    }

    if (value.paymentInstallments < 1 || value.paymentInstallments > 12) {
      context.addIssue({
        code: "custom",
        message: "Selecione um parcelamento valido para o cartao.",
        path: ["paymentInstallments"],
      });
    }

    if (value.paymentFeePayer === "not_applicable") {
      context.addIssue({
        code: "custom",
        message: "Selecione quem paga a taxa do cartao.",
        path: ["paymentFeePayer"],
      });
    }
  });
