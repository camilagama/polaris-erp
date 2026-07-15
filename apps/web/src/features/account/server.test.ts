import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  completeCommandExecution: vi.fn(),
  enqueueOutboxEvent: vi.fn(),
  reserveCommandExecution: vi.fn(),
  withTenantContext: vi.fn(),
}));

vi.mock("@polaris/events", () => ({
  completeCommandExecution: mocks.completeCommandExecution,
  enqueueOutboxEvent: mocks.enqueueOutboxEvent,
  reserveCommandExecution: mocks.reserveCommandExecution,
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withTenantContext: mocks.withTenantContext,
}));

describe("requestSubscriptionCancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the existing scheduled cancellation without dispatching it twice", async () => {
    const execute = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          cancelAtPeriodEnd: true,
          externalId: "asaas-subscription-1",
          id: "subscription-1",
          provider: "asaas",
        },
      ],
    });
    mocks.withTenantContext.mockImplementation(
      async (_organizationId, callback) => callback({ execute })
    );
    mocks.reserveCommandExecution.mockResolvedValue({
      commandId: "command-1",
      kind: "reserved",
    });
    mocks.completeCommandExecution.mockResolvedValue(undefined);

    const { requestSubscriptionCancellation } = await import(
      "@/features/account/server"
    );

    await expect(
      requestSubscriptionCancellation({
        actorUserId: "user-1",
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "organization-1",
      })
    ).resolves.toEqual({ subscriptionId: "subscription-1" });

    expect(mocks.enqueueOutboxEvent).not.toHaveBeenCalled();
    expect(mocks.completeCommandExecution).toHaveBeenCalledWith(
      expect.anything(),
      {
        commandId: "command-1",
        result: { subscriptionId: "subscription-1" },
        status: "succeeded",
      }
    );
  });

  it("persists an idempotent hosted-card checkout request without payment data", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            checkoutSessionId: "checkout-session-1",
            checkoutUrl: null,
            status: "pending",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    mocks.withTenantContext.mockImplementation(
      async (_organizationId, callback) => callback({ execute })
    );
    mocks.reserveCommandExecution.mockResolvedValue({
      commandId: "command-1",
      kind: "new",
    });
    mocks.completeCommandExecution.mockResolvedValue(undefined);
    mocks.enqueueOutboxEvent.mockResolvedValue("outbox-1");

    const { requestHostedCardCheckout } = await import(
      "@/features/account/server"
    );

    await expect(
      requestHostedCardCheckout({
        actorUserId: "user-1",
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "organization-1",
      })
    ).resolves.toEqual({
      checkoutSessionId: "checkout-session-1",
      checkoutUrl: null,
      status: "pending",
    });

    expect(mocks.enqueueOutboxEvent).toHaveBeenCalledWith(expect.anything(), {
      correlationId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "checkout.start",
      idempotencyKey: "billing-checkout-start:checkout-session-1",
      payload: { checkoutSessionId: "checkout-session-1" },
      topic: "billing.checkout",
    });
    expect(mocks.completeCommandExecution).toHaveBeenCalledWith(
      expect.anything(),
      {
        commandId: "command-1",
        result: {
          checkoutSessionId: "checkout-session-1",
          checkoutUrl: null,
          status: "pending",
        },
        status: "succeeded",
      }
    );
  });
});
