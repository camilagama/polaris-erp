import { captureException } from "@sentry/nextjs";
import { createSafeOperationalError } from "@/lib/observability";

/**
 * Generic JSON error for route handlers — avoids leaking internal details to clients.
 */
export const jsonError = (
  clientMessage: string,
  status: number,
  cause?: unknown
): Response => {
  if (cause !== undefined) {
    console.error(JSON.stringify({ source: "api_json_error", status }));
    if (process.env.SENTRY_DSN) {
      captureException(createSafeOperationalError("api_json_error"), {
        extra: { status },
        tags: { source: "api_json_error" },
      });
    }
  }

  return Response.json({ error: clientMessage }, { status });
};
