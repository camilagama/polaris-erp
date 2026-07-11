import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const importRoute = async ({
  token = "asaas-token",
}: {
  token?: string;
} = {}) => {
  vi.resetModules();

  const captureWebhookEvent = vi.fn().mockResolvedValue(undefined);
  const enqueueOutboxEvent = vi.fn().mockResolvedValue("outbox-1");
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  const reconcileAsaasBillingEvent = vi.fn().mockResolvedValue("processed");
  const withInternalJobContext = vi.fn(
    async (
      _name: string,
      callback: (tx: { execute: typeof execute }) => void
    ) => callback({ execute })
  );

  vi.doMock("@/lib/env", () => ({
    serverEnv: { ASAAS_WEBHOOK_TOKEN: token },
  }));
  vi.doMock("@polaris/db", () => ({ db: { execute } }));
  vi.doMock("@polaris/events", () => ({
    captureWebhookEvent,
    enqueueOutboxEvent,
  }));
  vi.doMock("@polaris/db/tenant-context", () => ({
    withInternalJobContext,
  }));
  vi.doMock("@/integrations/asaas/billing-reconciliation", () => ({
    reconcileAsaasBillingEvent,
  }));

  const route = await import("./route");

  return {
    captureWebhookEvent,
    enqueueOutboxEvent,
    execute,
    POST: route.POST as (request: Request) => Promise<Response>,
    reconcileAsaasBillingEvent,
    withInternalJobContext,
  };
};

const createRequest = ({
  body = {
    event: "PAYMENT_RECEIVED",
    id: "evt_123",
    payment: { externalReference: "billing-subscription:sub_1", id: "pay_1" },
  },
  contentLength,
  token = "asaas-token",
}: {
  body?: unknown;
  contentLength?: string;
  token?: string;
} = {}) =>
  new Request("https://app.example.com/api/webhooks/asaas", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "asaas-access-token": token,
      ...(contentLength ? { "content-length": contentLength } : {}),
    },
    method: "POST",
  });

describe("POST /api/webhooks/asaas", () => {
  it("rejects missing or invalid access tokens", async () => {
    const { captureWebhookEvent, POST } = await importRoute();

    const response = await POST(createRequest({ token: "wrong" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Invalid Asaas webhook token.",
    });
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized payloads before capture", async () => {
    const { captureWebhookEvent, POST } = await importRoute();

    const response = await POST(createRequest({ contentLength: "262145" }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "Webhook payload is too large.",
    });
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects invalid json and missing event ids", async () => {
    const { captureWebhookEvent, POST } = await importRoute();

    const invalidJsonResponse = await POST(createRequest({ body: "{" }));
    const missingEventIdResponse = await POST(createRequest({ body: {} }));

    expect(invalidJsonResponse.status).toBe(400);
    expect(await invalidJsonResponse.json()).toEqual({
      error: "Invalid Asaas webhook payload.",
    });
    expect(missingEventIdResponse.status).toBe(400);
    expect(await missingEventIdResponse.json()).toEqual({
      error: "Missing Asaas webhook event id.",
    });
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("captures, enqueues, and reconciles valid events idempotently", async () => {
    const {
      captureWebhookEvent,
      enqueueOutboxEvent,
      POST,
      reconcileAsaasBillingEvent,
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
        provider: "asaas",
      })
    );
    expect(enqueueOutboxEvent).toHaveBeenCalledTimes(2);
    expect(enqueueOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: "asaas-webhook:evt_123",
        status: "observed",
        topic: "asaas.webhook",
      })
    );
    expect(reconcileAsaasBillingEvent).toHaveBeenCalledTimes(2);
    expect(withInternalJobContext).toHaveBeenCalledWith(
      "billing_webhook_reconcile",
      expect.any(Function)
    );
  });
});
