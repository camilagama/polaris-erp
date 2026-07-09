import { createWooviBillingAdapter } from "@polaris/billing/providers/woovi";
import { describe, expect, it, vi } from "vitest";

describe("Woovi billing adapter", () => {
  it("creates Pix recurring subscriptions with correlationID and app authorization", async () => {
    const fetch = vi.fn(async () => ({
      json: async () => ({
        globalID: "woovi-subscription-1",
      }),
      ok: true,
    }));
    const adapter = createWooviBillingAdapter({
      apiKey: "app-id",
      baseUrl: "https://api.woovi.com/",
      fetch: fetch as never,
    });

    await expect(
      adapter.createPixRecurringSubscription({
        correlationID: "billing-subscription-1",
        customer: {
          email: "cliente@example.com",
          name: "Cliente",
        },
        dayGenerateCharge: 5,
        value: 4900,
      })
    ).resolves.toMatchObject({
      correlationID: "billing-subscription-1",
      paymentSubscriptionGlobalID: "woovi-subscription-1",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.woovi.com/api/v1/subscriptions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "app-id",
          "Content-Type": "application/json",
        }),
        method: "POST",
      })
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      correlationID: "billing-subscription-1",
      dayGenerateCharge: 5,
      value: 4900,
    });
  });

  it("throws when Woovi rejects the subscription request", async () => {
    const adapter = createWooviBillingAdapter({
      apiKey: "app-id",
      baseUrl: "https://api.woovi.com",
      fetch: vi.fn(async () => ({
        json: async () => ({ error: "invalid" }),
        ok: false,
      })) as never,
    });

    await expect(
      adapter.createPixRecurringSubscription({
        correlationID: "billing-subscription-1",
        customer: {
          email: "cliente@example.com",
          name: "Cliente",
        },
        dayGenerateCharge: 5,
        value: 4900,
      })
    ).rejects.toThrow("Woovi failed");
  });
});
