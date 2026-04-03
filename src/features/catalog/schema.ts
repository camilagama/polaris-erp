import { z } from "zod";
import {
  MAX_CARD_INSTALLMENTS,
  MIN_CARD_INSTALLMENTS,
} from "@/features/catalog/payment-rules";

export const categorySchema = z.object({
  description: z.string().trim().max(240).optional(),
  name: z.string().trim().min(1, "Informe um nome para a categoria.").max(80),
});

const cardInstallmentRuleSchema = z.object({
  feePercent: z.coerce
    .number()
    .min(0, "A taxa da parcela deve ser maior ou igual a zero."),
  installments: z.coerce
    .number()
    .int("As parcelas devem ser numeros inteiros.")
    .min(MIN_CARD_INSTALLMENTS)
    .max(MAX_CARD_INSTALLMENTS),
});

export const catalogSettingsSchema = z
  .object({
    cardInstallmentRules: z
      .array(cardInstallmentRuleSchema)
      .min(1, "Configure pelo menos 1x no cartao.")
      .max(MAX_CARD_INSTALLMENTS, "O limite maximo e de 12 parcelas."),
    idealMarkupPercent: z.coerce
      .number()
      .min(0, "A margem ideal deve ser maior ou igual a zero."),
    minimumMarkupPercent: z.coerce
      .number()
      .min(0, "A margem minima deve ser maior ou igual a zero."),
  })
  .superRefine((value, context) => {
    if (value.idealMarkupPercent < value.minimumMarkupPercent) {
      context.addIssue({
        code: "custom",
        message: "A margem ideal deve ser maior ou igual a margem minima.",
        path: ["idealMarkupPercent"],
      });
    }

    for (const [index, rule] of value.cardInstallmentRules.entries()) {
      const expectedInstallments = index + 1;

      if (rule.installments !== expectedInstallments) {
        context.addIssue({
          code: "custom",
          message:
            "As parcelas do cartao devem formar uma sequencia continua de 1x ate o maximo configurado.",
          path: ["cardInstallmentRules", index, "installments"],
        });
      }
    }
  });

export type CatalogSettingsInput = z.infer<typeof catalogSettingsSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
