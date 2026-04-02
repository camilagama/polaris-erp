import { z } from "zod";
import { isoDateSchema } from "@/lib/domain/date";

const saleItemSchema = z.object({
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
    items: z
      .array(saleItemSchema)
      .min(1, "Adicione pelo menos um item na venda."),
    notes: z.string().trim().max(240).optional(),
    occurredOn: isoDateSchema,
    paymentMethod: z.enum(["card", "pix"], {
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
  });
