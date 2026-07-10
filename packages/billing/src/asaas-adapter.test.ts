import { createAsaasBillingAdapter } from "@polaris/billing/providers/asaas";
import { describe, expect, it, vi } from "vitest";

type FetchCall = [string, { body: string }];

const getFirstFetchCall = (calls: unknown[][]): FetchCall => {
  const call = calls[0];

  if (
    !call ||
    typeof call[0] !== "string" ||
    typeof call[1] !== "object" ||
    call[1] === null ||
    !("body" in call[1]) ||
    typeof call[1].body !== "string"
  ) {
    throw new Error("Expected fetch to be called with a JSON body.");
  }

  return [call[0], { body: call[1].body }];
};

describe("Asaas billing adapter", () => {
  it("creates credit card subscriptions using tokenized cards only", async () => {
    const fetch = vi.fn(async () => ({
      json: async () => ({
        creditCardDetails: {
          creditCardBrand: "MASTERCARD",
          creditCardNumber: "8829",
        },
        id: "sub_123",
      }),
      ok: true,
    }));
    const adapter = createAsaasBillingAdapter({
      apiKey: "asaas-key",
      baseUrl: "https://api.asaas.com/v3/",
      fetch: fetch as never,
    });

    await expect(
      adapter.createCreditCardSubscription({
        creditCardToken: "card-token",
        customerId: "cus_123",
        cycle: "MONTHLY",
        description: "Plano Pro",
        externalReference: "billing-subscription-1",
        nextDueDate: "2026-08-09",
        value: 49.9,
      })
    ).resolves.toEqual({
      cardBrand: "MASTERCARD",
      cardLast4: "8829",
      externalReference: "billing-subscription-1",
      subscriptionId: "sub_123",
    });

    const [, request] = getFirstFetchCall(fetch.mock.calls);
    const body = JSON.parse(request.body);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.asaas.com/v3/subscriptions",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          access_token: "asaas-key",
        }),
        method: "POST",
      })
    );
    expect(body).toMatchObject({
      billingType: "CREDIT_CARD",
      creditCardToken: "card-token",
      customer: "cus_123",
      cycle: { interval: "MONTHLY" },
      externalReference: "billing-subscription-1",
    });
    expect(JSON.stringify(body)).not.toContain("cvv");
    expect(JSON.stringify(body)).not.toContain("number");
  });

  it("throws when Asaas rejects the subscription request", async () => {
    const adapter = createAsaasBillingAdapter({
      apiKey: "asaas-key",
      baseUrl: "https://api.asaas.com/v3",
      fetch: vi.fn(async () => ({
        json: async () => ({ errors: [{ description: "invalid" }] }),
        ok: false,
      })) as never,
    });

    await expect(
      adapter.createCreditCardSubscription({
        creditCardToken: "card-token",
        customerId: "cus_123",
        cycle: "MONTHLY",
        description: "Plano Pro",
        externalReference: "billing-subscription-1",
        nextDueDate: "2026-08-09",
        value: 49.9,
      })
    ).rejects.toThrow("Asaas failed");
  });
});
