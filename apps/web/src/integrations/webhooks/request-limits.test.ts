import { describe, expect, it } from "vitest";
import {
  isWebhookRequestTooLarge,
  MAX_WEBHOOK_BODY_BYTES,
  readWebhookRequestBody,
} from "@/integrations/webhooks/request-limits";

const createChunkedRequest = (chunks: Uint8Array[]): Request =>
  new Request("https://example.com/webhook", {
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
    duplex: "half",
    method: "POST",
  } as RequestInit & { duplex: "half" });

describe("webhook request limits", () => {
  it("rejects an advertised content length above the byte limit", () => {
    expect(
      isWebhookRequestTooLarge(
        new Request("https://example.com/webhook", {
          headers: { "content-length": String(MAX_WEBHOOK_BODY_BYTES + 1) },
          method: "POST",
        })
      )
    ).toBe(true);
  });

  it("accepts multibyte bodies exactly at the byte limit", async () => {
    const body = "á".repeat(MAX_WEBHOOK_BODY_BYTES / 2);

    await expect(
      readWebhookRequestBody(
        createChunkedRequest([new TextEncoder().encode(body)])
      )
    ).resolves.toBe(body);
  });

  it("rejects chunked bodies that exceed the byte limit", async () => {
    await expect(
      readWebhookRequestBody(
        createChunkedRequest([
          new Uint8Array(MAX_WEBHOOK_BODY_BYTES),
          new Uint8Array([1]),
        ])
      )
    ).resolves.toBeNull();
  });
});
