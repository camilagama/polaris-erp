export interface CreateAsaasHostedCheckoutInput {
  callback: {
    cancelUrl: string;
    expiredUrl: string;
    successUrl: string;
  };
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string;
  itemName: string;
  minutesToExpire: number;
  nextDueDate: string;
  value: number;
}

export interface CreateAsaasHostedCheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
  externalReference: string;
}

export interface AsaasAdapterOptions {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
}

export class AsaasCheckoutRejectedError extends Error {
  constructor() {
    super("Asaas rejected the hosted recurring checkout.");
  }
}

export class AsaasCheckoutUnknownOutcomeError extends Error {
  constructor() {
    super("Asaas checkout request has an unknown outcome.");
  }
}

const TRAILING_SLASH_PATTERN = /\/$/;
const ASAAS_CHECKOUT_PAGE_URL = "https://asaas.com/checkoutSession/show";

const trimTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASH_PATTERN, "");

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
  cancelSubscription: async (subscriptionId: string): Promise<void> => {
    const response = await fetch(
      `${trimTrailingSlash(baseUrl)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        headers: {
          access_token: apiKey,
        },
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Asaas failed to cancel subscription.");
    }
  },
  createHostedRecurringCheckout: async (
    input: CreateAsaasHostedCheckoutInput
  ): Promise<CreateAsaasHostedCheckoutResult> => {
    let response: Response;

    try {
      response = await fetch(`${trimTrailingSlash(baseUrl)}/checkouts`, {
        body: JSON.stringify({
          billingTypes: ["CREDIT_CARD"],
          callback: input.callback,
          chargeTypes: ["RECURRENT"],
          externalReference: input.externalReference,
          items: [
            {
              description: input.description,
              name: input.itemName,
              quantity: 1,
              value: input.value,
            },
          ],
          minutesToExpire: input.minutesToExpire,
          subscription: {
            cycle: input.cycle,
            nextDueDate: input.nextDueDate,
          },
        }),
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
        method: "POST",
      });
    } catch {
      throw new AsaasCheckoutUnknownOutcomeError();
    }

    if (!response.ok) {
      throw new AsaasCheckoutRejectedError();
    }

    let raw: unknown;

    try {
      raw = await response.json();
    } catch {
      throw new AsaasCheckoutUnknownOutcomeError();
    }

    const checkoutId = getString(raw, "id");

    if (!checkoutId) {
      throw new AsaasCheckoutUnknownOutcomeError();
    }

    return {
      checkoutId,
      checkoutUrl:
        getString(raw, "link") ??
        `${ASAAS_CHECKOUT_PAGE_URL}?id=${encodeURIComponent(checkoutId)}`,
      externalReference: input.externalReference,
    };
  },
});
