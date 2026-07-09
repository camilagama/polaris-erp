import type { ProductImageVariant } from "@/features/products/image-schema";
import { serverEnv } from "@/lib/env";

export const isProductImageStorageConfigured = () =>
  Boolean(
    serverEnv.R2_ACCOUNT_ID &&
      serverEnv.R2_ACCESS_KEY_ID &&
      serverEnv.R2_SECRET_ACCESS_KEY &&
      serverEnv.R2_BUCKET_PUBLIC &&
      serverEnv.R2_BUCKET_STAGING
  );

export const buildProductImageObjectKey = (
  organizationId: string,
  productId: string,
  version: number,
  variant: ProductImageVariant
) =>
  `organizations/${organizationId}/products/${productId}/v${version}/${variant}.webp`;

export const buildProductImageUrl = (
  organizationId: string,
  productId: string,
  version: number,
  variant: ProductImageVariant
) => `/api/product-images/${organizationId}/${productId}/${version}/${variant}`;
