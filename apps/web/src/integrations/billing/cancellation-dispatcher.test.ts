import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  dispatchBillingSubscriptionCancellation,
  parseBillingCancellationPayload,
} from "@/integrations/billing/cancellation-dispatcher";

describe("billing subscription cancellation dispatcher", () => {
  it("routes an Asaas cancellation without invoking the PIX provider", async () => {
    const cancelAsaasSubscription = vi.fn().mockResolvedValue(undefined);
    const cancelWooviSubscription = vi.fn().mockResolvedValue(undefined);

    await dispatchBillingSubscriptionCancellation(
      {
        provider: "asaas",
        providerSubscriptionId: "sub_asaas_1",
        subscriptionId: "subscription_1",
      },
      { cancelAsaasSubscription, cancelWooviSubscription }
    );

    expect(cancelAsaasSubscription).toHaveBeenCalledWith("sub_asaas_1");
    expect(cancelWooviSubscription).not.toHaveBeenCalled();
  });

  it("routes a Woovi cancellation without invoking the card provider", async () => {
    const cancelAsaasSubscription = vi.fn().mockResolvedValue(undefined);
    const cancelWooviSubscription = vi.fn().mockResolvedValue(undefined);

    await dispatchBillingSubscriptionCancellation(
      {
        provider: "woovi",
        providerSubscriptionId: "sub_woovi_1",
        subscriptionId: "subscription_1",
      },
      { cancelAsaasSubscription, cancelWooviSubscription }
    );

    expect(cancelWooviSubscription).toHaveBeenCalledWith("sub_woovi_1");
    expect(cancelAsaasSubscription).not.toHaveBeenCalled();
  });

  it("rejects malformed cancellation events before calling a provider", () => {
    expect(() =>
      parseBillingCancellationPayload({ provider: "asaas" })
    ).toThrow("Invalid billing subscription cancellation payload.");
  });
});
