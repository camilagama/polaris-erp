import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@polaris/db", () => ({ db: {} }));

const {
  claimOutboxEventMock,
  createFunctionMock,
  listClaimableMock,
  markFailedMock,
  markWebhookIntakeProcessedMock,
  markObservedMock,
  markProcessedMock,
  reconcileAsaasBillingEventMock,
  reconcileWooviBillingEventMock,
  recordResendEmailEventMock,
  reportTerminalOutboxFailureMock,
  withInternalJobContextMock,
} = vi.hoisted(() => ({
  claimOutboxEventMock: vi.fn(),
  createFunctionMock: vi.fn((options, triggerOrHandler, handler) => ({
    handler: handler ?? triggerOrHandler,
    options,
    trigger: options.triggers ?? triggerOrHandler,
  })),
  listClaimableMock: vi.fn(),
  markFailedMock: vi.fn(),
  markWebhookIntakeProcessedMock: vi.fn(),
  markObservedMock: vi.fn(),
  markProcessedMock: vi.fn(),
  reconcileAsaasBillingEventMock: vi.fn(),
  reconcileWooviBillingEventMock: vi.fn(),
  recordResendEmailEventMock: vi.fn(),
  reportTerminalOutboxFailureMock: vi.fn(),
  withInternalJobContextMock: vi.fn(),
}));

vi.mock("@polaris/events", () => ({
  claimOutboxEvent: claimOutboxEventMock,
  listClaimableOutboxEventIds: listClaimableMock,
  markOutboxEventFailed: markFailedMock,
  markOutboxEventObserved: markObservedMock,
  markOutboxEventProcessed: markProcessedMock,
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withInternalJobContext: withInternalJobContextMock,
}));

vi.mock("@/integrations/asaas/billing-reconciliation", () => ({
  reconcileAsaasBillingEvent: reconcileAsaasBillingEventMock,
}));

vi.mock("@/integrations/resend/email-service", () => ({
  recordResendEmailEvent: recordResendEmailEventMock,
}));

vi.mock("@/integrations/webhooks/intake", () => ({
  markWebhookIntakeProcessed: markWebhookIntakeProcessedMock,
}));

vi.mock("@/integrations/woovi/billing-reconciliation", () => ({
  reconcileWooviBillingEvent: reconcileWooviBillingEventMock,
}));

vi.mock("@/lib/observability", () => ({
  createSafeOperationalError: (source: string) =>
    new Error(`Operational error reported by ${source}.`),
  reportTerminalOutboxFailure: reportTerminalOutboxFailureMock,
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
    markWebhookIntakeProcessedMock.mockReset();
    markObservedMock.mockReset();
    markProcessedMock.mockReset();
    reconcileAsaasBillingEventMock.mockReset();
    reconcileWooviBillingEventMock.mockReset();
    recordResendEmailEventMock.mockReset();
    reportTerminalOutboxFailureMock.mockReset();
    withInternalJobContextMock.mockReset();
    listClaimableMock.mockReset();
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
      attempts: 1,
      claimToken: "claim-1",
      db: { execute: expect.any(Function) },
      error: "No outbox dispatcher registered for email:welcome.email.",
      eventId: "event-1",
    });
  });

  it("does not leave provider webhook topics capture-only", async () => {
    const { CAPTURE_ONLY_OUTBOX_TOPICS } = await import(
      "@/lib/inngest-functions"
    );

    expect(CAPTURE_ONLY_OUTBOX_TOPICS).toEqual([]);
  });

  it("reports an outbox event that exhausts its retry budget", async () => {
    claimOutboxEventMock.mockResolvedValueOnce({
      attempts: 5,
      claimToken: "claim-1",
      correlationId: "corr-1",
      eventType: "payment.confirmed",
      id: "event-1",
      payload: {},
      topic: "billing.webhook",
    });
    markFailedMock.mockResolvedValueOnce(true);

    const { processOutboxEvent } = await import("@/lib/inngest-functions");

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("failed");
    expect(reportTerminalOutboxFailureMock).toHaveBeenCalledWith({
      correlationId: "corr-1",
      eventId: "event-1",
      eventType: "payment.confirmed",
      topic: "billing.webhook",
    });
  });

  it("registers the outbox processor and recovery cron as Inngest functions", async () => {
    const { inngestFunctions } = await import("@/lib/inngest-functions");

    expect(inngestFunctions).toHaveLength(2);
    expect(createFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "process-outbox-event",
        triggers: [{ event: "outbox/event.pending" }],
      }),
      expect.any(Function)
    );
    expect(createFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        concurrency: { limit: 1 },
        id: "recover-outbox-events",
        retries: 3,
        triggers: [{ cron: "* * * * *" }],
      }),
      expect.any(Function)
    );
  });

  it("processes every currently claimable outbox event", async () => {
    const dispatcher = vi.fn().mockResolvedValue(undefined);
    listClaimableMock.mockResolvedValueOnce(["event-1", "event-2"]);
    claimOutboxEventMock
      .mockResolvedValueOnce({
        attempts: 1,
        claimToken: "claim-1",
        correlationId: "corr-1",
        eventType: "welcome.email",
        id: "event-1",
        payload: {},
        topic: "email",
      })
      .mockResolvedValueOnce({
        attempts: 1,
        claimToken: "claim-2",
        correlationId: "corr-2",
        eventType: "welcome.email",
        id: "event-2",
        payload: {},
        topic: "email",
      });
    markProcessedMock.mockResolvedValue(true);

    const { processClaimableOutboxEvents, registerOutboxDispatcher } =
      await import("@/lib/inngest-functions");
    registerOutboxDispatcher({
      dispatcher,
      eventType: "welcome.email",
      topic: "email",
    });

    await expect(
      processClaimableOutboxEvents({ execute: vi.fn() })
    ).resolves.toEqual(["processed", "processed"]);
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

  it("reconciles Asaas webhooks asynchronously from the durable outbox", async () => {
    const event = {
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "evt_123",
      eventType: "PAYMENT_RECEIVED",
      id: "event-1",
      payload: {
        event: "PAYMENT_RECEIVED",
        providerEventId: "evt_123",
      },
      topic: "asaas.webhook",
    };
    claimOutboxEventMock.mockResolvedValueOnce(event);
    markProcessedMock.mockResolvedValueOnce(true);
    reconcileAsaasBillingEventMock.mockResolvedValueOnce("processed");
    withInternalJobContextMock.mockImplementation(async (_name, callback) =>
      callback({ execute: vi.fn() })
    );

    const { processOutboxEvent } = await import("@/lib/inngest-functions");

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("processed");

    expect(reconcileAsaasBillingEventMock).toHaveBeenCalledWith(
      expect.anything(),
      event.payload,
      "evt_123"
    );
    expect(markWebhookIntakeProcessedMock).toHaveBeenCalledWith({
      eventId: "evt_123",
      lastError: null,
      provider: "asaas",
      status: "processed",
    });
  });

  it("reconciles Resend delivery events asynchronously from the durable outbox", async () => {
    const event = {
      attempts: 1,
      claimToken: "claim-1",
      correlationId: "evt_123",
      eventType: "email.delivered",
      id: "event-1",
      payload: {
        data: { emailId: "email_123" },
        providerEventId: "evt_123",
        type: "email.delivered",
      },
      topic: "resend.webhook",
    };
    claimOutboxEventMock.mockResolvedValueOnce(event);
    markProcessedMock.mockResolvedValueOnce(true);
    recordResendEmailEventMock.mockResolvedValueOnce(undefined);

    const { processOutboxEvent } = await import("@/lib/inngest-functions");

    await expect(
      processOutboxEvent({ execute: vi.fn() }, "event-1")
    ).resolves.toBe("processed");

    expect(recordResendEmailEventMock).toHaveBeenCalledWith(expect.anything(), {
      event: event.payload,
      providerEventId: "evt_123",
    });
    expect(markWebhookIntakeProcessedMock).toHaveBeenCalledWith({
      eventId: "evt_123",
      provider: "resend",
      status: "processed",
    });
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
    ).rejects.toThrow("Operational error reported by outbox_dispatch_failed.");
    expect(markFailedMock).toHaveBeenCalledWith({
      attempts: 1,
      claimToken: "claim-1",
      db: { execute: expect.any(Function) },
      error: "outbox_dispatch_failed:email:welcome.email",
      eventId: "event-1",
    });
  });
});
