import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@polaris/db", () => ({ db: {} }));

const {
  claimOutboxEventMock,
  createFunctionMock,
  markFailedMock,
  markProcessedMock,
} = vi.hoisted(() => ({
  claimOutboxEventMock: vi.fn(),
  createFunctionMock: vi.fn((options, trigger, handler) => ({
    handler,
    options,
    trigger,
  })),
  markFailedMock: vi.fn(),
  markProcessedMock: vi.fn(),
}));

vi.mock("@polaris/events", () => ({
  claimOutboxEvent: claimOutboxEventMock,
  markOutboxEventFailed: markFailedMock,
  markOutboxEventProcessed: markProcessedMock,
}));

vi.mock("@/lib/inngest-client", () => ({
  OUTBOX_EVENT_PENDING: "outbox/event.pending",
  inngest: {
    createFunction: createFunctionMock,
  },
}));

describe("inngest outbox functions", () => {
  afterEach(() => {
    claimOutboxEventMock.mockReset();
    createFunctionMock.mockClear();
    markFailedMock.mockReset();
    markProcessedMock.mockReset();
    vi.resetModules();
  });

  it("skips processing when the outbox event is no longer claimable", async () => {
    claimOutboxEventMock.mockResolvedValueOnce(null);

    const { processOutboxEvent } = await import("@/lib/inngest-functions");

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("skipped");
    expect(markFailedMock).not.toHaveBeenCalled();
    expect(markProcessedMock).not.toHaveBeenCalled();
  });

  it("marks claimed events without a dispatcher as observable but non-terminal", async () => {
    claimOutboxEventMock.mockResolvedValueOnce({
      attempts: 1,
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: {},
      topic: "email",
    });

    const { processOutboxEvent } = await import("@/lib/inngest-functions");

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("failed");
    expect(markFailedMock).toHaveBeenCalledWith({
      db: { execute: expect.any(Function) },
      error: "No outbox dispatcher registered for email:welcome.email.",
      eventId: "event-1",
    });
  });

  it("keeps webhook topics as explicit capture-only outbox policy", async () => {
    const { CAPTURE_ONLY_OUTBOX_TOPICS } = await import(
      "@/lib/inngest-functions"
    );

    expect(CAPTURE_ONLY_OUTBOX_TOPICS).toEqual([
      "asaas.webhook",
      "resend.webhook",
      "woovi.webhook",
    ]);
  });

  it("runs a registered dispatcher and marks the event processed", async () => {
    const dispatcher = vi.fn().mockResolvedValue(undefined);
    const event = {
      attempts: 1,
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: {},
      topic: "email",
    };
    claimOutboxEventMock.mockResolvedValueOnce(event);

    const { processOutboxEvent, registerOutboxDispatcher } = await import(
      "@/lib/inngest-functions"
    );
    registerOutboxDispatcher({
      dispatcher,
      eventType: "welcome.email",
      topic: "email",
    });

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("processed");
    expect(dispatcher).toHaveBeenCalledWith(event);
    expect(markProcessedMock).toHaveBeenCalledWith(
      { execute: expect.any(Function) },
      "event-1"
    );
  });

  it("marks dispatcher failures as retryable and rethrows for Inngest retry", async () => {
    const dispatcher = vi.fn().mockRejectedValue(new Error("resend timeout"));
    const event = {
      attempts: 1,
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: {},
      topic: "email",
    };
    claimOutboxEventMock.mockResolvedValueOnce(event);

    const { processOutboxEvent, registerOutboxDispatcher } = await import(
      "@/lib/inngest-functions"
    );
    registerOutboxDispatcher({
      dispatcher,
      eventType: "welcome.email",
      topic: "email",
    });

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).rejects.toThrow("resend timeout");
    expect(markFailedMock).toHaveBeenCalledWith({
      db: { execute: expect.any(Function) },
      error: "resend timeout",
      eventId: "event-1",
    });
  });
});
