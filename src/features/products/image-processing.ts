import "server-only";

import sharp from "sharp";
import {
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_TABLE_DIMENSION,
} from "@/features/products/image-schema";

export interface ProcessedProductImage {
  blurDataURL: string;
  detail: {
    buffer: Buffer;
    height: number;
    width: number;
  };
  table: {
    buffer: Buffer;
    height: number;
    width: number;
  };
}

const WEBP_EFFORT = 4;

const toBlurDataUrl = (buffer: Buffer) =>
  `data:image/webp;base64,${buffer.toString("base64")}`;

export const processProductImage = async (
  input: Buffer
): Promise<ProcessedProductImage> => {
  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(input, { animated: true }).metadata();
  } catch {
    throw new Error("Nao foi possivel ler a imagem enviada.");
  }

  if (!(metadata.width && metadata.height && metadata.format)) {
    throw new Error("A imagem enviada nao possui dimensoes validas.");
  }

  if (!["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new Error("Formato de imagem nao suportado.");
  }

  if ((metadata.pages ?? 1) > 1) {
    throw new Error("Imagens animadas nao sao suportadas.");
  }

  const normalized = sharp(input).rotate();

  const [detail, table, blur] = await Promise.all([
    normalized
      .clone()
      .resize({
        fit: sharp.fit.inside,
        height: PRODUCT_IMAGE_MAX_DIMENSION,
        width: PRODUCT_IMAGE_MAX_DIMENSION,
        withoutEnlargement: true,
      })
      .webp({
        effort: WEBP_EFFORT,
        quality: 82,
      })
      .toBuffer({ resolveWithObject: true }),
    normalized
      .clone()
      .resize({
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        fit: sharp.fit.contain,
        height: PRODUCT_IMAGE_TABLE_DIMENSION,
        width: PRODUCT_IMAGE_TABLE_DIMENSION,
        withoutEnlargement: true,
      })
      .webp({
        alphaQuality: 100,
        effort: WEBP_EFFORT,
        quality: 72,
      })
      .toBuffer({ resolveWithObject: true }),
    normalized
      .clone()
      .resize({
        fit: sharp.fit.inside,
        height: 16,
        width: 16,
        withoutEnlargement: true,
      })
      .webp({
        effort: WEBP_EFFORT,
        quality: 50,
      })
      .toBuffer(),
  ]);

  return {
    blurDataURL: toBlurDataUrl(blur),
    detail: {
      buffer: detail.data,
      height: detail.info.height,
      width: detail.info.width,
    },
    table: {
      buffer: table.data,
      height: table.info.height,
      width: table.info.width,
    },
  };
};
