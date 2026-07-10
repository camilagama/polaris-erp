export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export const isWebhookRequestTooLarge = (request: Request): boolean => {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return false;
  }

  const parsedContentLength = Number(contentLength);

  return (
    Number.isFinite(parsedContentLength) &&
    parsedContentLength > MAX_WEBHOOK_BODY_BYTES
  );
};
