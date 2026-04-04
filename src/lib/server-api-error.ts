import { captureException } from "@sentry/nextjs";

/**
 * Generic JSON error for route handlers — avoids leaking internal details to clients.
 */
export const jsonError = (
  clientMessage: string,
  status: number,
  cause?: unknown
): Response => {
  if (cause !== undefined) {
    console.error("[api]", clientMessage, cause);
    if (process.env.SENTRY_DSN) {
      const err =
        cause instanceof Error ? cause : new Error(String(cause), { cause });
      captureException(err, {
        extra: { clientMessage, status },
        tags: { source: "api_json_error" },
      });
    }
  }

  return Response.json({ error: clientMessage }, { status });
};
