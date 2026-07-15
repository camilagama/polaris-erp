import { captureRequestError, init } from "@sentry/nextjs";
import type { Instrumentation } from "next";

const getErrorDigest = (error: unknown): string | undefined =>
  error !== null &&
  typeof error === "object" &&
  "digest" in error &&
  typeof (error as { digest?: unknown }).digest === "string"
    ? (error as { digest: string }).digest
    : undefined;

const createSafeOperationalError = (source: string): Error =>
  new Error(`Operational error reported by ${source}.`);

function initSentryServer(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  init({
    dsn,
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    dataCollection: {
      httpBodies: [],
      userInfo: false,
    },
    beforeSend(event) {
      event.contexts = undefined;
      event.extra = undefined;
      event.request = undefined;
      event.tags = undefined;
      event.user = undefined;
      event.breadcrumbs = [];
      event.fingerprint = ["application_error"];
      event.message = "application_error";

      for (const exception of event.exception?.values ?? []) {
        exception.value = "application_error";
      }

      return event;
    },
    beforeSendTransaction() {
      return null;
    },
    tracesSampleRate: 0,
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
  const digest = getErrorDigest(error);
  captureRequestError(
    createSafeOperationalError("next_request_error"),
    request,
    context
  );

  console.error(
    JSON.stringify({
      digest,
      method: request.method,
      routeType: context.routeType,
      routerKind: context.routerKind,
    })
  );
};
