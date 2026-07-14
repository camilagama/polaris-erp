import {
  getPlatformEventsOverview,
  retryPlatformOutboxEvent,
} from "@polaris/platform/events";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { listEventOutboxMock, listWebhookEventsMock, retryOutboxEventMock } =
  vi.hoisted(() => ({
    listEventOutboxMock: vi.fn(),
    listWebhookEventsMock: vi.fn(),
    retryOutboxEventMock: vi.fn(),
  }));

vi.mock("@polaris/events", () => ({
  listEventOutbox: listEventOutboxMock,
  listWebhookEvents: listWebhookEventsMock,
  retryOutboxEvent: retryOutboxEventMock,
}));

const createTxMock = () => {
  const execute = vi.fn();
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { execute, insert, values };
};

describe("platform events", () => {
  it("returns event overview through the platform module", async () => {
    const db = { execute: vi.fn() };
    listEventOutboxMock.mockResolvedValueOnce([
      {
        attempts: 1,
        availableAt: "2026-07-13T00:00:00.000Z",
        correlationId: "correlation-1",
        eventType: "payment.created",
        id: "event-1",
        lastError: null,
        status: "failed",
        topic: "asaas.webhook",
      },
    ]);
    listWebhookEventsMock.mockResolvedValueOnce([
      {
        correlationId: "correlation-1",
        id: "webhook-1",
        lastError: null,
        provider: "asaas",
        providerEventId: "provider-event-1",
        receivedAt: "2026-07-13T00:00:00.000Z",
        status: "processed",
      },
    ]);

    await expect(getPlatformEventsOverview(db)).resolves.toEqual({
      outbox: [
        expect.objectContaining({
          id: "event-1",
          status: "failed",
        }),
      ],
      webhooks: [
        expect.objectContaining({
          id: "webhook-1",
          status: "processed",
        }),
      ],
    });
    expect(listEventOutboxMock).toHaveBeenCalledWith(db);
    expect(listWebhookEventsMock).toHaveBeenCalledWith(db);
  });

  it("retries outbox event and writes platform audit in one transaction", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };
    retryOutboxEventMock.mockResolvedValueOnce(true);

    await retryPlatformOutboxEvent(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        eventId: "event-1",
      },
      db
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(retryOutboxEventMock).toHaveBeenCalledWith(tx, "event-1");
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "outbox.retry_requested",
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        metadata: {
          eventId: "event-1",
        },
        subjectId: "event-1",
        subjectType: "event_outbox",
      })
    );
  });

  it("does not write audit when retry did not change an outbox event", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };
    retryOutboxEventMock.mockResolvedValueOnce(false);

    await expect(
      retryPlatformOutboxEvent(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorUserId: "user-1",
          eventId: "event-1",
        },
        db
      )
    ).resolves.toBe(false);

    expect(tx.values).not.toHaveBeenCalled();
  });

  it("rejects empty event ids without writing audit", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      retryPlatformOutboxEvent(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorUserId: "user-1",
          eventId: " ",
        },
        db
      )
    ).rejects.toThrow("Outbox event retry requires an event id.");

    expect(db.transaction).not.toHaveBeenCalled();
    expect(tx.values).not.toHaveBeenCalled();
  });
});
