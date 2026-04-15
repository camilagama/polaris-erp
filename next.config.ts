import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const TRAILING_SLASH_PATTERN = /\/$/;
const PLACEHOLDER_DOMAIN_PATTERN = /seu-dominio\.com/i;

const normalizeBaseUrl = (value: string) =>
  value.replace(TRAILING_SLASH_PATTERN, "");

const parseOrigin = (value: string): string | null => {
  try {
    return new URL(normalizeBaseUrl(value)).origin;
  } catch {
    return null;
  }
};

/**
 * Only allow `next/image` optimization for the real public media origin.
 * Same-origin app URLs are unnecessary (and widen the allowlist); `/api/...`
 * fallbacks do not need a remote pattern.
 */
const imageRemotePatterns = (() => {
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!publicBase || PLACEHOLDER_DOMAIN_PATTERN.test(publicBase)) {
    return [];
  }

  const publicOrigin = parseOrigin(publicBase);
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? parseOrigin(process.env.NEXT_PUBLIC_APP_URL)
    : null;

  if (publicOrigin && appOrigin && publicOrigin === appOrigin) {
    return [];
  }

  try {
    return [new URL(`${normalizeBaseUrl(publicBase)}/**`)];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  ...(process.env.VERCEL_ENV
    ? { env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV } }
    : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: imageRemotePatterns,
  },
  reactStrictMode: true,
  reactCompiler: true,
};

const sentryCanUpload =
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT);

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !sentryCanUpload,
  },
  webpack: {
    treeshake: {
      removeTracing: true,
    },
  },
});
