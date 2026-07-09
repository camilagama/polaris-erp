import { z } from "zod";

export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_DIMENSION = 1600;
export const PRODUCT_IMAGE_TABLE_DIMENSION = 160;
export const PRODUCT_IMAGE_PRESIGN_EXPIRES_IN_SECONDS = 60 * 5;

export const productImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProductImageMimeType = (typeof productImageMimeTypes)[number];
export type ProductImageVariant = "detail" | "table";

export const productImageUploadRequestSchema = z.object({
  contentType: z.enum(productImageMimeTypes),
  size: z
    .number()
    .int("Tamanho do arquivo invalido.")
    .min(1, "Selecione uma imagem.")
    .max(PRODUCT_IMAGE_MAX_BYTES, "A imagem excede o limite de 10 MB."),
});

export const stagedProductImageSchema = z.object({
  contentType: z.enum(productImageMimeTypes),
  objectKey: z.string().trim().min(1, "Referencia da imagem invalida."),
  size: z
    .number()
    .int("Tamanho da imagem invalido.")
    .min(1, "Imagem invalida.")
    .max(PRODUCT_IMAGE_MAX_BYTES, "A imagem excede o limite de 10 MB."),
});

export type StagedProductImageInput = z.infer<typeof stagedProductImageSchema>;
