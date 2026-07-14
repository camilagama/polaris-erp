import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const importIntake = async () => {
  vi.resetModules();

  const defaultDb = {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    insert: vi.fn(),
  };
  const captureWebhookEvent = vi.fn().mockResolvedValue(undefined);
  const enqueueOutboxEvent = vi.fn().mockResolvedValue("outbox-1");

  vi.doMock("@polaris/db", () => ({ db: defaultDb }));
  vi.doMock("@polaris/events", () => ({
    captureWebhookEvent,
    enqueueOutboxEvent,
  }));
  vi.doMock("drizzle-orm", () => ({
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings: Array.from(strings),
      values,
    }),
  }));

  const intake = await import("./intake");

  return {
    captureWebhookEvent,
    defaultDb,
    enqueueOutboxEvent,
    markWebhookIntakeProcessed: intake.markWebhookIntakeProcessed,
    observeWebhookIntake: intake.observeWebhookIntake,
  };
};

describe("webhook intake", () => {
  it("captures and enqueues observed provider events with normalized defaults", async () => {
    const { captureWebhookEvent, enqueueOutboxEvent, observeWebhookIntake } =
      await importIntake();
    const db = { execute: vi.fn(), insert: vi.fn() };

    await observeWebhookIntake(
      {
        eventId: "evt_123",
        eventType: "payment.received",
        headers: { "x-request-id": "req_123" },
        payload: { id: "evt_123" },
        provider: "asaas",
        rawBody: '{"id":"evt_123"}',
      },
      db
    );

    expect(captureWebhookEvent).toHaveBeenCalledWith(db, {
      correlationId: "evt_123",
      eventId: "evt_123",
      headers: { "x-request-id": "req_123" },
      payload: { id: "evt_123" },
      provider: "asaas",
      rawBody: '{"id":"evt_123"}',
    });
    expect(enqueueOutboxEvent).toHaveBeenCalledWith(db, {
      correlationId: "evt_123",
      eventType: "payment.received",
      idempotencyKey: "asaas-webhook:evt_123",
      payload: { id: "evt_123" },
      status: "observed",
      topic: "asaas.webhook",
    });
  });

  it("honors explicit correlation, topic, and idempotency values", async () => {
    const { enqueueOutboxEvent, observeWebhookIntake } = await importIntake();
    const db = { execute: vi.fn(), insert: vi.fn() };

    await observeWebhookIntake(
      {
        correlationId: "corr_123",
        eventId: "evt_123",
        eventType: "email.delivered",
        headers: {},
        idempotencyKey: "resend:msg_123",
        payload: {},
        provider: "resend",
        rawBody: "{}",
        topic: "email.webhook",
      },
      db
    );

    expect(enqueueOutboxEvent).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        correlationId: "corr_123",
        idempotencyKey: "resend:msg_123",
        topic: "email.webhook",
      })
    );
  });

  it("marks webhook rows with processing status and optional error", async () => {
    const { markWebhookIntakeProcessed } = await importIntake();
    const db = { execute: vi.fn().mockResolvedValue({ rows: [] }) };

    await markWebhookIntakeProcessed(
      {
        eventId: "evt_123",
        lastError: "manual_review",
        provider: "woovi",
        status: "failed",
      },
      db
    );

    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        strings: expect.arrayContaining([
          expect.stringContaining("update webhook_events"),
        ]),
        values: ["failed", "manual_review", "woovi", "evt_123"],
      })
    );
  });
});
