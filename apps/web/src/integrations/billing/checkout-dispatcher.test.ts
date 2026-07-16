import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  withInternalJobContext: vi.fn(),
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withInternalJobContext: mocks.withInternalJobContext,
}));

import {
  dispatchHostedCardCheckout,
  parseBillingCheckoutPayload,
} from "@/integrations/billing/checkout-dispatcher";

describe("billing checkout dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts only a checkout session identifier", () => {
    expect(
      parseBillingCheckoutPayload({ checkoutSessionId: "checkout-session-1" })
    ).toEqual({ checkoutSessionId: "checkout-session-1" });
  });

  it("rejects missing or malformed checkout payloads", () => {
    expect(() => parseBillingCheckoutPayload({})).toThrow(
      "Invalid billing checkout payload."
    );
    expect(() => parseBillingCheckoutPayload(null as never)).toThrow(
      "Invalid billing checkout payload."
    );
  });

  it("creates a provider-hosted checkout without payer data", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            amountCents: 4990,
            checkoutSessionId: "checkout-session-1",
            description: "Plano mensal - assinatura mensal",
            expiresAt: new Date("2030-01-01T00:00:00.000Z"),
            externalReference: "billing-subscription:subscription-1",
            itemName: "Plano mensal",
            providerRequestStartedAt: null,
            status: "pending",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.withInternalJobContext.mockImplementation(async (_job, callback) =>
      callback({ execute })
    );
    const createAsaasHostedRecurringCheckout = vi.fn().mockResolvedValue({
      checkoutId: "asaas-checkout-1",
      checkoutUrl: "https://asaas.example/checkout-1",
      externalReference: "billing-subscription:subscription-1",
    });

    await dispatchHostedCardCheckout(
      { checkoutSessionId: "checkout-session-1" },
      {
        adapters: { createAsaasHostedRecurringCheckout },
        canonicalAppUrl: "https://app.example.com",
      }
    );

    expect(createAsaasHostedRecurringCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        callback: {
          cancelUrl: "https://app.example.com/configuracoes?checkout=cancel",
          expiredUrl: "https://app.example.com/configuracoes?checkout=expired",
          successUrl: "https://app.example.com/configuracoes?checkout=success",
        },
        cycle: "MONTHLY",
        externalReference: "billing-subscription:subscription-1",
        value: 49.9,
      })
    );
    expect(
      createAsaasHostedRecurringCheckout.mock.calls[0][0]
    ).not.toHaveProperty("customerData");
    expect(
      createAsaasHostedRecurringCheckout.mock.calls[0][0]
    ).not.toHaveProperty("creditCard");
  });

  it("sends the Sao Paulo business date to the provider", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T02:30:00.000Z"));
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            amountCents: 4990,
            checkoutSessionId: "checkout-session-2",
            description: "Plano mensal - assinatura mensal",
            expiresAt: new Date("2030-01-01T00:00:00.000Z"),
            externalReference: "billing-subscription:subscription-2",
            itemName: "Plano mensal",
            providerRequestStartedAt: null,
            status: "pending",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.withInternalJobContext.mockImplementation(async (_job, callback) =>
      callback({ execute })
    );
    const createAsaasHostedRecurringCheckout = vi.fn().mockResolvedValue({
      checkoutId: "asaas-checkout-2",
      checkoutUrl: "https://asaas.example/checkout-2",
      externalReference: "billing-subscription:subscription-2",
    });

    await dispatchHostedCardCheckout(
      { checkoutSessionId: "checkout-session-2" },
      {
        adapters: { createAsaasHostedRecurringCheckout },
        canonicalAppUrl: "https://app.example.com",
      }
    );

    expect(createAsaasHostedRecurringCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ nextDueDate: "2025-12-31" })
    );
  });
});
