import type { ProductImageVariant } from "@/features/products/image-schema";
import { serverEnv } from "@/lib/env";

const TRAILING_SLASHES_PATTERN = /\/+$/;
const PLACEHOLDER_DOMAIN_PATTERN = /seu-dominio\.com/i;

const trimTrailingSlash = (value: string) =>
  value.replace(TRAILING_SLASHES_PATTERN, "");

const parseOrigin = (value: string): string | null => {
  try {
    return new URL(trimTrailingSlash(value)).origin;
  } catch {
    return null;
  }
};

const collectConfiguredAppOrigins = (): Set<string> => {
  const origins = new Set<string>();
  const appOrigin = parseOrigin(serverEnv.NEXT_PUBLIC_APP_URL);
  if (appOrigin) {
    origins.add(appOrigin);
  }
  const authOrigin = parseOrigin(serverEnv.BETTER_AUTH_URL);
  if (authOrigin) {
    origins.add(authOrigin);
  }
  return origins;
};

/**
 * `R2_PUBLIC_BASE_URL` must point at the public CDN/custom domain for the R2
 * public bucket — not the Next app origin. Misconfiguration would 404 under
 * `products/...` paths that only exist on the bucket.
 */
const isPublicBaseUrlSameOriginAsApp = (value: string): boolean => {
  const publicOrigin = parseOrigin(value);
  if (!publicOrigin) {
    return true;
  }
  return collectConfiguredAppOrigins().has(publicOrigin);
};

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
) => {
  const objectKey = buildProductImageObjectKey(
    organizationId,
    productId,
    version,
    variant
  );
  const publicBaseUrl = serverEnv.R2_PUBLIC_BASE_URL;

  if (
    publicBaseUrl &&
    !PLACEHOLDER_DOMAIN_PATTERN.test(publicBaseUrl) &&
    !isLocalAppUrl(publicBaseUrl) &&
    !isPublicBaseUrlSameOriginAsApp(publicBaseUrl)
  ) {
    const baseUrl = trimTrailingSlash(publicBaseUrl);
    return `${baseUrl}/${objectKey}`;
  }

  return `/api/product-images/${organizationId}/${productId}/${version}/${variant}`;
};
