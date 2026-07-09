export interface WooviCustomerInput {
  email: string;
  name: string;
  phone?: string;
  taxID?: string;
}

export interface CreateWooviPixRecurringSubscriptionInput {
  correlationID: string;
  customer: WooviCustomerInput;
  dayGenerateCharge: number;
  value: number;
}

export interface CreateWooviPixRecurringSubscriptionResult {
  correlationID: string;
  paymentSubscriptionGlobalID: string | null;
  raw: unknown;
}

export interface WooviAdapterOptions {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
}

const TRAILING_SLASH_PATTERN = /\/$/;

const trimTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASH_PATTERN, "");

const getString = (value: unknown, key: string): string | null => {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return null;
  }

  const field = (value as Record<string, unknown>)[key];

  return typeof field === "string" && field.length > 0 ? field : null;
};

export const createWooviBillingAdapter = ({
  apiKey,
  baseUrl,
  fetch,
}: WooviAdapterOptions) => ({
  createPixRecurringSubscription: async (
    input: CreateWooviPixRecurringSubscriptionInput
  ): Promise<CreateWooviPixRecurringSubscriptionResult> => {
    const response = await fetch(
      `${trimTrailingSlash(baseUrl)}/api/v1/subscriptions`,
      {
        body: JSON.stringify({
          correlationID: input.correlationID,
          customer: input.customer,
          dayGenerateCharge: input.dayGenerateCharge,
          value: input.value,
        }),
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    const raw = await response.json();

    if (!response.ok) {
      throw new Error("Woovi failed to create Pix recurring subscription.");
    }

    return {
      correlationID: input.correlationID,
      paymentSubscriptionGlobalID:
        getString(raw, "paymentSubscriptionGlobalID") ??
        getString(raw, "globalID"),
      raw,
    };
  },
});
