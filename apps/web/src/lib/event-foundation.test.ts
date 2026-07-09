import { describe, expect, it, vi } from "vitest";
import {
  buildWebhookEventKey,
  captureWebhookEvent,
  hashRawBody,
  redactWebhookHeaders,
} from "@/lib/event-foundation";

vi.mock("server-only", () => ({}));

const createInsertMock = () => {
  const onConflictDoNothing = vi.fn();
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));

  return { insert, onConflictDoNothing, values };
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
        authorization: "Bearer secret",
        "content-type": "application/json",
        cookie: "session=secret",
        "x-webhook-signature": "signature-secret",
      })
    ).toEqual({
      authorization: "[redacted]",
      "content-type": "application/json",
      cookie: "[redacted]",
      "x-webhook-signature": "[redacted]",
    });
  });

  it("captures webhook events idempotently without storing raw secrets", async () => {
    const db = createInsertMock();

    await captureWebhookEvent(db as never, {
      correlationId: "corr-1",
      eventId: "evt_123",
      headers: {
        authorization: "Bearer secret",
        "content-type": "application/json",
      },
      payload: { type: "email.delivered" },
      provider: "resend",
      rawBody: '{"type":"email.delivered"}',
    });

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
});
