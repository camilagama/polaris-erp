export interface CreateAsaasCreditCardSubscriptionInput {
  creditCardToken: string;
  customerId: string;
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string;
  nextDueDate: string;
  value: number;
}

export interface CreateAsaasCreditCardSubscriptionResult {
  cardBrand: string | null;
  cardLast4: string | null;
  externalReference: string;
  subscriptionId: string;
}

export interface AsaasAdapterOptions {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
}

const TRAILING_SLASH_PATTERN = /\/$/;

const trimTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASH_PATTERN, "");

const getRecord = (
  value: unknown,
  key: string
): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return null;
  }

  const field = (value as Record<string, unknown>)[key];

  return typeof field === "object" && field !== null
    ? (field as Record<string, unknown>)
    : null;
};

const getString = (value: unknown, key: string): string | null => {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return null;
  }

  const field = (value as Record<string, unknown>)[key];

  return typeof field === "string" && field.length > 0 ? field : null;
};

export const createAsaasBillingAdapter = ({
  apiKey,
  baseUrl,
  fetch,
}: AsaasAdapterOptions) => ({
  createCreditCardSubscription: async (
    input: CreateAsaasCreditCardSubscriptionInput
  ): Promise<CreateAsaasCreditCardSubscriptionResult> => {
    const response = await fetch(
      `${trimTrailingSlash(baseUrl)}/subscriptions`,
      {
        body: JSON.stringify({
          billingType: "CREDIT_CARD",
          creditCardToken: input.creditCardToken,
          customer: input.customerId,
          cycle: { interval: input.cycle },
          description: input.description,
          externalReference: input.externalReference,
          nextDueDate: input.nextDueDate,
          value: input.value,
        }),
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
        method: "POST",
      }
    );
    const raw = await response.json();

    if (!response.ok) {
      throw new Error("Asaas failed to create credit card subscription.");
    }

    const subscriptionId = getString(raw, "id");

    if (!subscriptionId) {
      throw new Error("Asaas did not return a subscription id.");
    }

    const creditCardDetails = getRecord(raw, "creditCardDetails");

    return {
      cardBrand: creditCardDetails
        ? getString(creditCardDetails, "creditCardBrand")
        : null,
      cardLast4: creditCardDetails
        ? getString(creditCardDetails, "creditCardNumber")
        : null,
      externalReference: input.externalReference,
      subscriptionId,
    };
  },
});
