import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const importRoute = async ({
  verifyImpl = () => ({
    data: { email_id: "email_123" },
    type: "email.delivered",
  }),
}: {
  verifyImpl?: () => unknown;
} = {}) => {
  vi.resetModules();

  const captureWebhookEvent = vi.fn().mockResolvedValue(undefined);
  const enqueueOutboxEvent = vi.fn().mockResolvedValue("outbox-1");
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  const recordResendEmailEvent = vi.fn().mockResolvedValue(undefined);
  const redactResendWebhookPayload = vi.fn((event: unknown) => event);
  const verify = vi.fn(verifyImpl);

  vi.doMock("@/lib/env", () => ({
    serverEnv: {
      RESEND_API_KEY: "resend-key",
      RESEND_WEBHOOK_SECRET: "resend-secret",
    },
  }));
  vi.doMock("@polaris/db", () => ({ db: { execute } }));
  vi.doMock("@polaris/events", () => ({
    captureWebhookEvent,
    enqueueOutboxEvent,
  }));
  vi.doMock("resend", () => ({
    Resend: vi.fn(function Resend() {
      return { webhooks: { verify } };
    }),
  }));
  vi.doMock("@/integrations/resend/email-service", () => ({
    recordResendEmailEvent,
    redactResendWebhookPayload,
  }));

  const route = await import("./route");

  return {
    captureWebhookEvent,
    enqueueOutboxEvent,
    POST: route.POST as (request: Request) => Promise<Response>,
    recordResendEmailEvent,
    verify,
  };
};

const createRequest = ({
  body = { data: { email_id: "email_123" }, type: "email.delivered" },
  contentLength,
  headers = {
    "svix-id": "msg_123",
    "svix-signature": "sig_123",
    "svix-timestamp": "123",
  },
}: {
  body?: unknown;
  contentLength?: string;
  headers?: Record<string, string>;
} = {}) =>
  new Request("https://app.example.com/api/webhooks/resend", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      ...headers,
      ...(contentLength ? { "content-length": contentLength } : {}),
    },
    method: "POST",
  });

describe("POST /api/webhooks/resend", () => {
  it("rejects missing Svix headers", async () => {
    const { captureWebhookEvent, POST, verify } = await importRoute();

    const response = await POST(createRequest({ headers: {} }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing Resend webhook headers.",
    });
    expect(verify).not.toHaveBeenCalled();
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized payloads before verification", async () => {
    const { captureWebhookEvent, POST, verify } = await importRoute();

    const response = await POST(createRequest({ contentLength: "262145" }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "Webhook payload is too large.",
    });
    expect(verify).not.toHaveBeenCalled();
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects invalid signatures", async () => {
    const { captureWebhookEvent, POST } = await importRoute({
      verifyImpl: () => {
        throw new Error("invalid");
      },
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid Resend webhook signature.",
    });
    expect(captureWebhookEvent).not.toHaveBeenCalled();
  });

  it("captures, enqueues, and records verified events idempotently", async () => {
    const {
      captureWebhookEvent,
      enqueueOutboxEvent,
      POST,
      recordResendEmailEvent,
      verify,
    } = await importRoute();

    const firstResponse = await POST(createRequest());
    const secondResponse = await POST(createRequest());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(captureWebhookEvent).toHaveBeenCalledTimes(2);
    expect(captureWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: "msg_123",
        provider: "resend",
      })
    );
    expect(enqueueOutboxEvent).toHaveBeenCalledTimes(2);
    expect(enqueueOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: "resend-webhook:msg_123",
        topic: "resend.webhook",
      })
    );
    expect(recordResendEmailEvent).toHaveBeenCalledTimes(2);
  });
});
