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

export const onRouterTransitionStart = captureRouterTransitionStart;
