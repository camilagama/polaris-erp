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

export const readWebhookRequestBody = async (
  request: Request
): Promise<string | null> => {
  const body = request.body;

  if (!body) {
    return "";
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      byteLength += value.byteLength;

      if (byteLength > MAX_WEBHOOK_BODY_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const payload = new Uint8Array(byteLength);
  let offset = 0;

  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(payload);
};
