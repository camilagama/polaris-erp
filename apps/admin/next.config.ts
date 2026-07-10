import { loadEnvConfig } from "@next/env";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

loadEnvConfig("../..");

const nextConfig: NextConfig = {
  ...(process.env.VERCEL_ENV
    ? { env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV } }
    : {}),
  cacheComponents: true,
  experimental: {
    authInterrupts: true,
  },
  reactCompiler: true,
  reactStrictMode: true,
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
