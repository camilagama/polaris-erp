import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@polaris/db", () => ({ db: {} }));

const {
  claimOutboxEventMock,
  createFunctionMock,
  markFailedMock,
  markObservedMock,
  markProcessedMock,
} = vi.hoisted(() => ({
  claimOutboxEventMock: vi.fn(),
  createFunctionMock: vi.fn((options, triggerOrHandler, handler) => ({
    handler: handler ?? triggerOrHandler,
    options,
    trigger: options.triggers ?? triggerOrHandler,
  })),
  markFailedMock: vi.fn(),
  markObservedMock: vi.fn(),
  markProcessedMock: vi.fn(),
}));

vi.mock("@polaris/events", () => ({
  claimOutboxEvent: claimOutboxEventMock,
  markOutboxEventFailed: markFailedMock,
  markOutboxEventObserved: markObservedMock,
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
    markObservedMock.mockReset();
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
    expect(markObservedMock).not.toHaveBeenCalled();
    expect(markProcessedMock).not.toHaveBeenCalled();
  });

  it("marks claimed events without a dispatcher as observable but non-terminal", async () => {
    claimOutboxEventMock.mockResolvedValueOnce({
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: {},
      topic: "email",
    });
    markFailedMock.mockResolvedValueOnce(true);

    const { processOutboxEvent } = await import("@/lib/inngest-functions");

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("failed");
    expect(markFailedMock).toHaveBeenCalledWith({
      claimToken: "claim-1",
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

  it("marks legacy capture-only events as observed without retrying", async () => {
    claimOutboxEventMock.mockResolvedValueOnce({
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "corr-1",
      eventType: "PAYMENT_RECEIVED",
      id: "event-1",
      payload: {},
      topic: "asaas.webhook",
    });
    markObservedMock.mockResolvedValueOnce(true);

    const { processOutboxEvent } = await import("@/lib/inngest-functions");

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("observed");
    expect(markObservedMock).toHaveBeenCalledWith(
      { execute: expect.any(Function) },
      "event-1",
      "claim-1",
      "Outbox topic asaas.webhook is capture-only and is not dispatched."
    );
    expect(markFailedMock).not.toHaveBeenCalled();
  });

  it("registers the outbox processor as an Inngest function", async () => {
    const { inngestFunctions } = await import("@/lib/inngest-functions");

    expect(inngestFunctions).toHaveLength(1);
    expect(createFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "process-outbox-event",
        triggers: [{ event: "outbox/event.pending" }],
      }),
      expect.any(Function)
    );
  });

  it("runs a registered dispatcher and marks the event processed", async () => {
    const dispatcher = vi.fn().mockResolvedValue(undefined);
    const event = {
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: {},
      topic: "email",
    };
    claimOutboxEventMock.mockResolvedValueOnce(event);
    markProcessedMock.mockResolvedValueOnce(true);

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
      "event-1",
      "claim-1"
    );
  });

  it("does not report processing when the outbox lease changed", async () => {
    const dispatcher = vi.fn().mockResolvedValue(undefined);
    const event = {
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: {},
      topic: "email",
    };
    claimOutboxEventMock.mockResolvedValueOnce(event);
    markFailedMock.mockResolvedValueOnce(true);
    markProcessedMock.mockResolvedValueOnce(false);

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
    ).resolves.toBe("skipped");
  });

  it("marks dispatcher failures as retryable and rethrows for Inngest retry", async () => {
    const dispatcher = vi.fn().mockRejectedValue(new Error("resend timeout"));
    const event = {
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "corr-1",
      eventType: "welcome.email",
      id: "event-1",
      payload: {},
      topic: "email",
    };
    claimOutboxEventMock.mockResolvedValueOnce(event);
    markFailedMock.mockResolvedValueOnce(true);

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
      claimToken: "claim-1",
      db: { execute: expect.any(Function) },
      error: "resend timeout",
      eventId: "event-1",
    });
  });
});
