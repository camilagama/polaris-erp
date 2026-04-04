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
  }

  return Response.json({ error: clientMessage }, { status });
};
