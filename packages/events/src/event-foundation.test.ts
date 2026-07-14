import {
  buildWebhookEventKey,
  captureWebhookEvent,
  claimOutboxEvent,
  enqueueOutboxEvent,
  hashRawBody,
  markOutboxEventFailed,
  markOutboxEventObserved,
  markOutboxEventProcessed,
  redactWebhookHeaders,
  retryOutboxEvent,
} from "@polaris/events";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createInsertMock = () => {
  const returning = vi.fn().mockResolvedValue([{ id: "webhook-1" }]);
  const onConflictDoNothing = vi.fn();
  onConflictDoNothing.mockReturnValue({ returning });
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));

  return { insert, onConflictDoNothing, returning, values };
};

describe("event foundation helpers", () => {
  it("builds stable webhook idempotency keys", () => {
    expect(buildWebhookEventKey("resend", "evt_123")).toBe("resend:evt_123");
  });

  it("hashes raw bodies and redacts sensitive headers", () => {
    expect(hashRawBody("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
    expect(
      redactWebhookHeaders({
        "Asaas-Access-Token": "asaas-secret",
        Authorization: "Bearer secret",
        "content-type": "application/json",
        Cookie: "session=secret",
        "svix-id": "msg_123",
        "Svix-Signature": "svix-secret",
        "X-Webhook-Signature": "woovi-secret",
      })
    ).toEqual({
      "asaas-access-token": "[redacted]",
      authorization: "[redacted]",
      "content-type": "application/json",
      cookie: "[redacted]",
      "svix-id": "msg_123",
      "svix-signature": "[redacted]",
      "x-webhook-signature": "[redacted]",
    });
  });

  it("captures webhook events idempotently without storing raw secrets", async () => {
    const db = createInsertMock();

    await expect(
      captureWebhookEvent(db as never, {
        correlationId: "corr-1",
        eventId: "evt_123",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        payload: { type: "email.delivered" },
        provider: "resend",
        rawBody: '{"type":"email.delivered"}',
      })
    ).resolves.toBe("claimed");

    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: "corr-1",
        idempotencyKey: "resend:evt_123",
        provider: "resend",
        providerEventId: "evt_123",
        rawBodySha256:
          "535799124c18a17be0d968d1622289e68ac38bcb476da8a6532d9e4f256b7c0b",
        redactedHeaders: {
          authorization: "[redacted]",
          "content-type": "application/json",
        },
      })
    );
    expect(db.onConflictDoNothing).toHaveBeenCalledOnce();
    expect(JSON.stringify(db.values.mock.calls)).not.toContain("Bearer secret");
  });

  it("claims a pending outbox event for durable processing", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          attempts: 1,
          claim_token: "claim-1",
          correlation_id: "corr-1",
          event_type: "welcome.email",
          id: "event-1",
          payload: { userId: "user-1" },
          topic: "email",
        },
      ],
    });

    await expect(claimOutboxEvent({ execute }, "event-1")).resolves.toEqual({
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: { userId: "user-1" },
      topic: "email",
    });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("enqueues outbox events idempotently and returns the persisted id", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [{ id: "event-1" }],
    });

    await expect(
      enqueueOutboxEvent(
        { execute },
        {
          correlationId: "corr-1",
          eventType: "email.delivered",
          idempotencyKey: "resend-webhook:evt_123",
          payload: { type: "email.delivered" },
          topic: "resend.webhook",
        }
      )
    ).resolves.toBe("event-1");
    expect(execute).toHaveBeenCalledOnce();
  });

  it("can record capture-only outbox events as observed", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [{ id: "event-1" }],
    });

    await expect(
      enqueueOutboxEvent(
        { execute },
        {
          correlationId: "corr-1",
          eventType: "email.delivered",
          idempotencyKey: "resend-webhook:evt_123",
          payload: { type: "email.delivered" },
          status: "observed",
          topic: "resend.webhook",
        }
      )
    ).resolves.toBe("event-1");
    expect(execute).toHaveBeenCalledOnce();
  });

  it("returns null when an outbox event cannot be claimed", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });

    await expect(claimOutboxEvent({ execute }, "event-1")).resolves.toBeNull();
  });

  it("does not complete an outbox event after its lease token changes", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });

    await expect(
      markOutboxEventProcessed({ execute }, "event-1", "stale-claim")
    ).resolves.toBe(false);
  });

  it("does not requeue an outbox event after its lease token changes", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });

    await expect(
      markOutboxEventFailed({
        claimToken: "stale-claim",
        db: { execute },
        error: "dispatcher timeout",
        eventId: "event-1",
      })
    ).resolves.toBe(false);
  });

  it("does not observe an outbox event after its lease token changes", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });

    await expect(
      markOutboxEventObserved(
        { execute },
        "event-1",
        "stale-claim",
        "capture-only"
      )
    ).resolves.toBe(false);
  });

  it("reports when retry did not change a terminal outbox event", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });

    await expect(retryOutboxEvent({ execute }, "event-1")).resolves.toBe(false);
  });

  it("marks outbox events as processed, observed or failed", async () => {
    const execute = vi.fn().mockResolvedValue({});
    const db = { execute };

    await markOutboxEventProcessed(db, "event-1", "claim-1");
    await markOutboxEventObserved(db, "event-2", "claim-2", "capture-only");
    await markOutboxEventFailed({
      claimToken: "claim-3",
      db,
      error: "No dispatcher registered.",
      eventId: "event-3",
    });

    expect(execute).toHaveBeenCalledTimes(3);
  });
});
