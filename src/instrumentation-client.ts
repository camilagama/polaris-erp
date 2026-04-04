import { captureRouterTransitionStart, init } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV?.trim();
const sentryEnvironment =
  vercelEnv && vercelEnv.length > 0
    ? vercelEnv
    : (process.env.NODE_ENV ?? "development");

if (dsn) {
  init({
    dsn,
    environment: sentryEnvironment,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = captureRouterTransitionStart;
