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
    const dateRange = { from: "2026-07-07", to: "2026-07-13" };
    listEventOutboxMock.mockResolvedValueOnce([
      {
        attempts: 1,
        availableAt: "2026-07-13T00:00:00.000Z",
        correlationId: "correlation-1",
        createdAt: "2026-07-13T00:00:00.000Z",
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

    await expect(getPlatformEventsOverview(db, dateRange)).resolves.toEqual({
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
    expect(listEventOutboxMock).toHaveBeenCalledWith(db, {
      ...dateRange,
      timeZone: "America/Sao_Paulo",
    });
    expect(listWebhookEventsMock).toHaveBeenCalledWith(db, {
      ...dateRange,
      timeZone: "America/Sao_Paulo",
    });
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
        actorAdminUserId: "user-1",
        eventId: "event-1",
        reason: "provider recovered",
      },
      db
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(retryOutboxEventMock).toHaveBeenCalledWith(tx, "event-1");
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "outbox.retry_requested",
        actorPlatformAdminId: "platform-admin-1",
        actorAdminUserId: "user-1",
        metadata: {
          eventId: "event-1",
          reason: "provider recovered",
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
          actorAdminUserId: "user-1",
          eventId: "event-1",
          reason: "provider recovered",
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
          actorAdminUserId: "user-1",
          eventId: " ",
          reason: "provider recovered",
        },
        db
      )
    ).rejects.toThrow("Outbox event retry requires an event id.");

    expect(db.transaction).not.toHaveBeenCalled();
    expect(tx.values).not.toHaveBeenCalled();
  });

  it("rejects missing retry reasons without writing audit", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      retryPlatformOutboxEvent(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorAdminUserId: "user-1",
          eventId: "event-1",
          reason: " ",
        },
        db
      )
    ).rejects.toThrow(
      "Outbox event retry requires a reason of up to 240 characters."
    );

    expect(db.transaction).not.toHaveBeenCalled();
    expect(tx.values).not.toHaveBeenCalled();
  });
});
