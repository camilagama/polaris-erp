import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const importIntake = async ({
  captureResult = "claimed",
  enqueueError,
}: {
  captureResult?: "claimed" | "duplicate";
  enqueueError?: Error;
} = {}) => {
  vi.resetModules();

  const defaultDb = {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    insert: vi.fn(),
    transaction: vi.fn(async (callback) => callback(defaultDb)),
  };
  const captureWebhookEvent = vi.fn().mockResolvedValue(captureResult);
  const enqueueOutboxEvent = enqueueError
    ? vi.fn().mockRejectedValue(enqueueError)
    : vi.fn().mockResolvedValue("outbox-1");

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
    const db = {
      execute: vi.fn(),
      insert: vi.fn(),
      transaction: vi.fn(async (callback) => callback(db)),
    };

    await expect(
      observeWebhookIntake(
        {
          eventId: "evt_123",
          eventType: "payment.received",
          headers: { "x-request-id": "req_123" },
          payload: { id: "evt_123" },
          provider: "asaas",
          rawBody: '{"id":"evt_123"}',
        },
        db
      )
    ).resolves.toBe("claimed");

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
      status: "pending",
      topic: "asaas.webhook",
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("honors explicit correlation, topic, and idempotency values", async () => {
    const { enqueueOutboxEvent, observeWebhookIntake } = await importIntake();
    const db = {
      execute: vi.fn(),
      insert: vi.fn(),
      transaction: vi.fn(async (callback) => callback(db)),
    };

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

  it("does not enqueue a duplicate provider event", async () => {
    const { enqueueOutboxEvent, observeWebhookIntake } = await importIntake({
      captureResult: "duplicate",
    });

    await expect(
      observeWebhookIntake({
        eventId: "evt_123",
        eventType: "payment.received",
        headers: {},
        payload: { id: "evt_123" },
        provider: "asaas",
        rawBody: '{"id":"evt_123"}',
      })
    ).resolves.toBe("duplicate");

    expect(enqueueOutboxEvent).not.toHaveBeenCalled();
  });

  it("rejects the transaction when enqueueing fails so the capture is rolled back", async () => {
    const enqueueError = new Error("outbox unavailable");
    const { captureWebhookEvent, enqueueOutboxEvent, observeWebhookIntake } =
      await importIntake({ enqueueError });
    const db = {
      execute: vi.fn(),
      insert: vi.fn(),
      transaction: vi.fn(async (callback) => callback(db)),
    };

    await expect(
      observeWebhookIntake(
        {
          eventId: "evt_123",
          eventType: "payment.received",
          headers: {},
          payload: { id: "evt_123" },
          provider: "asaas",
          rawBody: '{"id":"evt_123"}',
        },
        db
      )
    ).rejects.toThrow("outbox unavailable");

    expect(captureWebhookEvent).toHaveBeenCalledTimes(1);
    expect(enqueueOutboxEvent).toHaveBeenCalledTimes(1);
    expect(db.transaction).toHaveBeenCalledTimes(1);
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
