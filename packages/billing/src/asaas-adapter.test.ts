import {
  AsaasCheckoutRejectedError,
  AsaasCheckoutUnknownOutcomeError,
  createAsaasBillingAdapter,
} from "@polaris/billing/providers/asaas";
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
  it("cancels a provider subscription without touching settled charges", async () => {
    const fetch = vi.fn(async () => ({ ok: true }));
    const adapter = createAsaasBillingAdapter({
      apiKey: "asaas-key",
      baseUrl: "https://api.asaas.com/v3/",
      fetch: fetch as never,
    });

    await expect(
      adapter.cancelSubscription("sub_123")
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.asaas.com/v3/subscriptions/sub_123",
      {
        headers: { access_token: "asaas-key" },
        method: "DELETE",
      }
    );
  });

  it("creates an Asaas-hosted recurring checkout without payer data", async () => {
    const fetch = vi.fn(async () => ({
      json: async () => ({ id: "checkout_123" }),
      ok: true,
    }));
    const adapter = createAsaasBillingAdapter({
      apiKey: "asaas-key",
      baseUrl: "https://api.asaas.com/v3/",
      fetch: fetch as never,
    });

    await expect(
      adapter.createHostedRecurringCheckout({
        callback: {
          cancelUrl: "https://app.example.com/billing/cancelled",
          expiredUrl: "https://app.example.com/billing/expired",
          successUrl: "https://app.example.com/billing/success",
        },
        cycle: "MONTHLY",
        description: "Plano mensal Polaris",
        externalReference: "checkout:subscription-1",
        itemName: "Polaris mensal",
        minutesToExpire: 60,
        nextDueDate: "2026-08-09 00:00:00",
        value: 49.9,
      })
    ).resolves.toEqual({
      checkoutId: "checkout_123",
      checkoutUrl: "https://asaas.com/checkoutSession/show?id=checkout_123",
      externalReference: "checkout:subscription-1",
    });

    const [, request] = getFirstFetchCall(fetch.mock.calls);
    const body = JSON.parse(request.body);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.asaas.com/v3/checkouts",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          access_token: "asaas-key",
        }),
        method: "POST",
      })
    );
    expect(body).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      externalReference: "checkout:subscription-1",
      subscription: {
        cycle: "MONTHLY",
        nextDueDate: "2026-08-09 00:00:00",
      },
    });
    expect(body).not.toHaveProperty("customerData");
    expect(JSON.stringify(body)).not.toContain("creditCardToken");
    expect(JSON.stringify(body)).not.toContain("cpfCnpj");
  });

  it("fails closed when Asaas rejects the hosted checkout", async () => {
    const adapter = createAsaasBillingAdapter({
      apiKey: "asaas-key",
      baseUrl: "https://api.asaas.com/v3",
      fetch: vi.fn(async () => ({
        json: async () => ({ errors: [{ description: "invalid" }] }),
        ok: false,
      })) as never,
    });

    await expect(
      adapter.createHostedRecurringCheckout({
        callback: {
          cancelUrl: "https://app.example.com/billing/cancelled",
          expiredUrl: "https://app.example.com/billing/expired",
          successUrl: "https://app.example.com/billing/success",
        },
        cycle: "MONTHLY",
        description: "Plano mensal Polaris",
        externalReference: "checkout:subscription-1",
        itemName: "Polaris mensal",
        minutesToExpire: 60,
        nextDueDate: "2026-08-09 00:00:00",
        value: 49.9,
      })
    ).rejects.toBeInstanceOf(AsaasCheckoutRejectedError);
  });

  it("marks a network interruption as an unknown provider outcome", async () => {
    const adapter = createAsaasBillingAdapter({
      apiKey: "asaas-key",
      baseUrl: "https://api.asaas.com/v3",
      fetch: vi.fn(() =>
        Promise.reject(new Error("network interrupted"))
      ) as never,
    });

    await expect(
      adapter.createHostedRecurringCheckout({
        callback: {
          cancelUrl: "https://app.example.com/billing/cancelled",
          expiredUrl: "https://app.example.com/billing/expired",
          successUrl: "https://app.example.com/billing/success",
        },
        cycle: "MONTHLY",
        description: "Plano mensal Polaris",
        externalReference: "checkout:subscription-1",
        itemName: "Polaris mensal",
        minutesToExpire: 60,
        nextDueDate: "2026-08-09 00:00:00",
        value: 49.9,
      })
    ).rejects.toBeInstanceOf(AsaasCheckoutUnknownOutcomeError);
  });
});
