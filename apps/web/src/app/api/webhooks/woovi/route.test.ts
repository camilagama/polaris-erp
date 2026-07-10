import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const secret = "woovi-secret";

const signBody = (rawBody: string): string =>
  createHmac("sha256", secret).update(rawBody).digest("hex");

const importRoute = async () => {
  vi.resetModules();

  const captureWebhookEvent = vi.fn().mockResolvedValue(undefined);
  const enqueueOutboxEvent = vi.fn().mockResolvedValue("outbox-1");
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  const reconcileWooviBillingEvent = vi.fn().mockResolvedValue("processed");
  const withInternalJobContext = vi.fn(
    async (
      _name: string,
      callback: (tx: { execute: typeof execute }) => void
    ) => callback({ execute })
  );

  vi.doMock("@/lib/env", () => ({
    serverEnv: { WOOVI_WEBHOOK_SECRET: secret },
  }));
  vi.doMock("@polaris/db", () => ({ db: { execute } }));
  vi.doMock("@polaris/events", () => ({
    captureWebhookEvent,
    enqueueOutboxEvent,
  }));
  vi.doMock("@polaris/db/tenant-context", () => ({
    withInternalJobContext,
  }));
  vi.doMock("@/integrations/woovi/billing-reconciliation", () => ({
    reconcileWooviBillingEvent,
  }));

  const route = await import("./route");

  return {
    captureWebhookEvent,
    enqueueOutboxEvent,
    POST: route.POST as (request: Request) => Promise<Response>,
    reconcileWooviBillingEvent,
    withInternalJobContext,
  };
};

const createRequest = ({
  body = {
    correlationID: "billing-subscription:sub_1",
    event: "PIX_AUTOMATIC_APPROVED",
    globalID: "evt_123",
  },
  contentLength,
  signature,
}: {
  body?: unknown;
  contentLength?: string;
  signature?: string | null;
} = {}) => {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = {};

  if (signature !== null) {
    headers["x-webhook-signature"] = signature ?? signBody(rawBody);
  }

  if (contentLength) {
    headers["content-length"] = contentLength;
  }

  return new Request("https://app.example.com/api/webhooks/woovi", {
    body: rawBody,
    headers,
    method: "POST",
  });
};

describe("POST /api/webhooks/woovi", () => {
  it("rejects missing signatures", async () => {
    const { captureWebhookEvent, POST } = await importRoute();

    const response = await POST(createRequest({ signature: null }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing Woovi webhook signature.",
    });
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized payloads before signature verification", async () => {
    const { captureWebhookEvent, POST } = await importRoute();

    const response = await POST(createRequest({ contentLength: "262145" }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "Webhook payload is too large.",
    });
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects invalid signatures and invalid payloads", async () => {
    const { captureWebhookEvent, POST } = await importRoute();

    const invalidSignatureResponse = await POST(
      createRequest({ signature: "wrong" })
    );
    const invalidPayloadResponse = await POST(
      createRequest({ body: "{", signature: signBody("{") })
    );

    expect(invalidSignatureResponse.status).toBe(400);
    expect(await invalidSignatureResponse.json()).toEqual({
      error: "Invalid Woovi webhook signature.",
    });
    expect(invalidPayloadResponse.status).toBe(400);
    expect(await invalidPayloadResponse.json()).toEqual({
      error: "Invalid Woovi webhook payload.",
    });
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("captures, enqueues, and reconciles valid events idempotently", async () => {
    const {
      captureWebhookEvent,
      enqueueOutboxEvent,
      POST,
      reconcileWooviBillingEvent,
      withInternalJobContext,
    } = await importRoute();

    const firstResponse = await POST(createRequest());
    const secondResponse = await POST(createRequest());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(captureWebhookEvent).toHaveBeenCalledTimes(2);
    expect(captureWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: "evt_123",
        provider: "woovi",
      })
    );
    expect(enqueueOutboxEvent).toHaveBeenCalledTimes(2);
    expect(enqueueOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: "woovi-webhook:evt_123",
        topic: "woovi.webhook",
      })
    );
    expect(reconcileWooviBillingEvent).toHaveBeenCalledTimes(2);
    expect(withInternalJobContext).toHaveBeenCalledWith(
      "billing_webhook_reconcile",
      expect.any(Function)
    );
  });
});
