/**
 * Product images served under this path are proxied by Next with session auth.
 * The Next image optimizer fetches URLs server-side without the browser session,
 * so `next/image` must use `unoptimized` for these sources.
 */
export const isSessionProxiedProductImageSrc = (src: string): boolean =>
  src.startsWith("/api/product-images/");
