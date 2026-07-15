import "server-only";

export interface BillingCancellationPayload {
  provider: "asaas" | "woovi";
  providerSubscriptionId: string;
  subscriptionId: string;
}

export interface BillingCancellationAdapters {
  cancelAsaasSubscription: (subscriptionId: string) => Promise<void>;
  cancelWooviSubscription: (subscriptionId: string) => Promise<void>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseBillingCancellationPayload = (
  payload: Record<string, unknown>
): BillingCancellationPayload => {
  const { provider, providerSubscriptionId, subscriptionId } = payload;

  if (
    (provider !== "asaas" && provider !== "woovi") ||
    typeof providerSubscriptionId !== "string" ||
    providerSubscriptionId.length === 0 ||
    typeof subscriptionId !== "string" ||
    subscriptionId.length === 0 ||
    !isRecord(payload)
  ) {
    throw new Error("Invalid billing subscription cancellation payload.");
  }

  return { provider, providerSubscriptionId, subscriptionId };
};

export const dispatchBillingSubscriptionCancellation = async (
  payload: Record<string, unknown>,
  adapters: BillingCancellationAdapters
): Promise<void> => {
  const cancellation = parseBillingCancellationPayload(payload);

  if (cancellation.provider === "asaas") {
    await adapters.cancelAsaasSubscription(cancellation.providerSubscriptionId);
    return;
  }

  await adapters.cancelWooviSubscription(cancellation.providerSubscriptionId);
};
