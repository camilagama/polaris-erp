import type { ProductImageVariant } from "@/features/products/image-schema";
import { serverEnv } from "@/lib/env";

const TRAILING_SLASHES_PATTERN = /\/+$/;

const trimTrailingSlash = (value: string) =>
  value.replace(TRAILING_SLASHES_PATTERN, "");

export const isProductImageStorageConfigured = () =>
  Boolean(
    serverEnv.R2_ACCOUNT_ID &&
      serverEnv.R2_ACCESS_KEY_ID &&
      serverEnv.R2_SECRET_ACCESS_KEY &&
      serverEnv.R2_BUCKET_PUBLIC &&
      serverEnv.R2_BUCKET_STAGING &&
      serverEnv.R2_PUBLIC_BASE_URL
  );

export const buildProductImageObjectKey = (
  productId: string,
  version: number,
  variant: ProductImageVariant
) => `products/${productId}/v${version}/${variant}.webp`;

export const buildProductImageUrl = (
  productId: string,
  version: number,
  variant: ProductImageVariant
) => {
  if (!serverEnv.R2_PUBLIC_BASE_URL) {
    throw new Error("As imagens de produto ainda nao foram configuradas.");
  }

  const baseUrl = trimTrailingSlash(serverEnv.R2_PUBLIC_BASE_URL);
  const objectKey = buildProductImageObjectKey(productId, version, variant);

  return `${baseUrl}/${objectKey}`;
};
