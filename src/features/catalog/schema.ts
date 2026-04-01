import { z } from "zod";
import { MAX_CARD_INSTALLMENTS } from "@/features/catalog/payment-rules";

export const categorySchema = z.object({
  description: z.string().trim().max(240).optional(),
  name: z.string().trim().min(1, "Informe um nome para a categoria.").max(80),
});

const paymentFeeRuleSchema = z.object({
  code: z.string().min(1),
  feePercent: z.coerce
    .number()
    .min(0, "A taxa deve ser maior ou igual a zero."),
  installments: z.coerce.number().int().min(0).max(MAX_CARD_INSTALLMENTS),
  paymentMethod: z.enum(["card", "pix"]),
});

export const catalogSettingsSchema = z
  .object({
    paymentFeeRules: z
      .array(paymentFeeRuleSchema)
      .min(1, "Configure pelo menos uma regra de pagamento."),
    idealMarkupPercent: z.coerce
      .number()
      .min(0, "A margem ideal deve ser maior ou igual a zero."),
    minimumMarkupPercent: z.coerce
      .number()
      .min(0, "A margem minima deve ser maior ou igual a zero."),
  })
  .refine((value) => value.idealMarkupPercent >= value.minimumMarkupPercent, {
    message: "A margem ideal deve ser maior ou igual a margem minima.",
    path: ["idealMarkupPercent"],
  });

export type CatalogSettingsInput = z.infer<typeof catalogSettingsSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
