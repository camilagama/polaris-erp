import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const TRAILING_SLASH_PATTERN = /\/$/;

const imageRemotePatterns = (() => {
  const remoteUrls = [
    process.env.R2_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value));

  return remoteUrls.map(
    (value) => new URL(`${value.replace(TRAILING_SLASH_PATTERN, "")}/**`)
  );
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
