import { captureRouterTransitionStart, init } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = captureRouterTransitionStart;
