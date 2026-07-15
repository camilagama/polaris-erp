import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/app-session", () => ({ requireAppContext: vi.fn() }));
vi.mock("@/features/account/server", () => ({
  getHostedCardCheckout: vi.fn(),
  requestHostedCardCheckout: vi.fn(),
  requestSubscriptionCancellation: vi.fn(),
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const accountServer = await import("@/features/account/server");
  const cache = await import("next/cache");
  const appSession = await import("@/lib/app-session");

  return {
    getHostedCardCheckout: accountServer.getHostedCardCheckout as MockFn,
    requestHostedCardCheckout:
      accountServer.requestHostedCardCheckout as MockFn,
    requestSubscriptionCancellation:
      accountServer.requestSubscriptionCancellation as MockFn,
    requireAppContext: appSession.requireAppContext as MockFn,
    refresh: cache.refresh as MockFn,
  };
};

describe("account billing server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts hosted checkout only after authenticating the organization", async () => {
    const mocks = await resolveMocks();
    mocks.requireAppContext.mockResolvedValue({
      organizationId: "org_1",
      userId: "user_1",
    });
    mocks.requestHostedCardCheckout.mockResolvedValue({
      checkoutSessionId: "550e8400-e29b-41d4-a716-446655440000",
      checkoutUrl: null,
      status: "pending",
    });

    const { requestHostedCardCheckoutAction } = await import(
      "@/features/account/actions"
    );

    await expect(
      requestHostedCardCheckoutAction({
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).resolves.toEqual({
      checkoutSessionId: "550e8400-e29b-41d4-a716-446655440000",
      checkoutUrl: null,
      status: "pending",
    });

    expect(mocks.requestHostedCardCheckout).toHaveBeenCalledWith({
      actorUserId: "user_1",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      organizationId: "org_1",
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("authenticates, validates the idempotency key, and refreshes after requesting cancellation", async () => {
    const mocks = await resolveMocks();
    mocks.requireAppContext.mockResolvedValue({
      organizationId: "org_1",
      userId: "user_1",
    });
    mocks.requestSubscriptionCancellation.mockResolvedValue({
      subscriptionId: "sub_1",
    });

    const { requestSubscriptionCancellationAction } = await import(
      "@/features/account/actions"
    );

    await expect(
      requestSubscriptionCancellationAction({
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).resolves.toEqual({ subscriptionId: "sub_1" });

    expect(mocks.requireAppContext).toHaveBeenCalledWith("settings:write");
    expect(mocks.requestSubscriptionCancellation).toHaveBeenCalledWith({
      actorUserId: "user_1",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      organizationId: "org_1",
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh when the cancellation request is rejected", async () => {
    const mocks = await resolveMocks();
    mocks.requireAppContext.mockResolvedValue({
      organizationId: "org_1",
      userId: "user_1",
    });
    mocks.requestSubscriptionCancellation.mockRejectedValue(
      new Error("Assinatura ativa com provider nao encontrada.")
    );

    const { requestSubscriptionCancellationAction } = await import(
      "@/features/account/actions"
    );

    await expect(
      requestSubscriptionCancellationAction({
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).rejects.toThrow("Assinatura ativa com provider nao encontrada.");

    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
