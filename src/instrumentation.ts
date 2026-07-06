import { captureRequestError, init } from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { getSentrySamplingConfig } from "@/lib/sentry-config";

function initSentryServer(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  init({
    dsn,
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    enableLogs: true,
    tracesSampleRate: getSentrySamplingConfig({
      nodeEnv: process.env.NODE_ENV,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE,
    }).tracesSampleRate,
  });
}

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    initSentryServer();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    initSentryServer();
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context
) => {
  captureRequestError(error, request, context);

  const message = error instanceof Error ? error.message : String(error);
  const digest =
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : undefined;

  console.error(
    JSON.stringify({
      digest,
      message,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    })
  );
};
