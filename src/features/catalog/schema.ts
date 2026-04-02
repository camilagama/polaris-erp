import { z } from "zod";

export const categorySchema = z.object({
  description: z.string().trim().max(240).optional(),
  name: z.string().trim().min(1, "Informe um nome para a categoria.").max(80),
});

export const catalogSettingsSchema = z
  .object({
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
