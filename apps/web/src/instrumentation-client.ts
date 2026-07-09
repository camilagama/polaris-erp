import {
  captureRouterTransitionStart,
  init,
  replayIntegration,
} from "@sentry/nextjs";
import { getSentrySamplingConfig } from "@/lib/sentry-config";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV?.trim();
const sentryEnvironment =
  vercelEnv && vercelEnv.length > 0
    ? vercelEnv
    : (process.env.NODE_ENV ?? "development");

if (dsn) {
  const samplingConfig = getSentrySamplingConfig({
    nodeEnv: process.env.NODE_ENV,
    replaysOnErrorSampleRate:
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    replaysSessionSampleRate:
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  });

  init({
    dsn,
    enableLogs: true,
    environment: sentryEnvironment,
    integrations: [replayIntegration()],
    ...samplingConfig,
  });
}

export const onRouterTransitionStart = captureRouterTransitionStart;
