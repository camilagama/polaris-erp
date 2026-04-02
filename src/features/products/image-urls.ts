import type { ProductImageVariant } from "@/features/products/image-schema";
import { serverEnv } from "@/lib/env";

const TRAILING_SLASHES_PATTERN = /\/+$/;
const PLACEHOLDER_DOMAIN_PATTERN = /seu-dominio\.com/i;

const trimTrailingSlash = (value: string) =>
  value.replace(TRAILING_SLASHES_PATTERN, "");

const isLocalAppUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ["127.0.0.1", "localhost"].includes(url.hostname);
  } catch {
    return false;
  }
};

export const isProductImageStorageConfigured = () =>
  Boolean(
    serverEnv.R2_ACCOUNT_ID &&
      serverEnv.R2_ACCESS_KEY_ID &&
      serverEnv.R2_SECRET_ACCESS_KEY &&
      serverEnv.R2_BUCKET_PUBLIC &&
      serverEnv.R2_BUCKET_STAGING &&
      (serverEnv.R2_PUBLIC_BASE_URL || serverEnv.NEXT_PUBLIC_APP_URL)
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
  const objectKey = buildProductImageObjectKey(productId, version, variant);
  const publicBaseUrl = serverEnv.R2_PUBLIC_BASE_URL;

  if (
    publicBaseUrl &&
    !PLACEHOLDER_DOMAIN_PATTERN.test(publicBaseUrl) &&
    !isLocalAppUrl(publicBaseUrl)
  ) {
    const baseUrl = trimTrailingSlash(publicBaseUrl);
    return `${baseUrl}/${objectKey}`;
  }

  return `/api/product-images/${productId}/${version}/${variant}`;
};
