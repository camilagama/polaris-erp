import { z } from "zod";
import { isoDateSchema } from "@/lib/domain/date-validation";

export const createProductSchema = z.object({
  categoryId: z.string().min(1, "Categoria e obrigatoria."),
  costPrice: z.coerce.number().min(0, "Custo invalido."),
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nome e obrigatorio."),
  price: z.coerce.number().min(0, "Preco invalido."),
  purchasedOn: isoDateSchema,
  stock: z.coerce
    .number()
    .int("Estoque deve ser um numero inteiro.")
    .min(0, "Estoque deve ser maior ou igual a zero."),
});

export const updateProductSchema = z.object({
  categoryId: z.string().min(1, "Categoria e obrigatoria."),
  description: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nome e obrigatorio."),
  price: z.coerce.number().min(0, "Preco invalido."),
});

export const stockAdditionSchema = z.object({
  quantity: z.coerce
    .number()
    .int("Quantidade deve ser um numero inteiro.")
    .min(1, "Quantidade deve ser maior que zero."),
  stockedOn: isoDateSchema,
  unitCost: z.coerce.number().min(0, "Custo invalido."),
});

export const stockWriteOffSchema = z.object({
  happenedOn: isoDateSchema,
  notes: z.string().trim().max(240).optional(),
  quantity: z.coerce
    .number()
    .int("Quantidade deve ser um numero inteiro.")
    .min(1, "Quantidade deve ser maior que zero."),
  reason: z.enum(["adjustment", "operational"]),
});

export const softDeleteProductSchema = z.object({
  confirmed: z.literal(true, {
    error: "Confirme a remocao definitiva do produto.",
  }),
  reason: z
    .string()
    .trim()
    .min(3, "Informe o motivo da remocao definitiva.")
    .max(240, "O motivo deve ter no maximo 240 caracteres."),
});

export const productImageVersionSchema = z
  .number()
  .int("Versao da imagem invalida.")
  .positive("Versao da imagem invalida.");
