import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  mapAsaasSubscriptionStatus,
  reconcileAsaasBillingEvent,
} from "@/integrations/asaas/billing-reconciliation";

vi.mock("server-only", () => ({}));

const source = readFileSync(
  join(
    process.cwd(),
    "src",
    "integrations",
    "asaas",
    "billing-reconciliation.ts"
  ),
  "utf8"
);

const createDb = () => {
  const execute = vi
    .fn()
    .mockResolvedValueOnce({
      rows: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          organization_id: "org_1",
        },
      ],
    })
    .mockResolvedValue({ rows: [] });

  return {
    execute,
    transaction: async <T>(
      callback: (transaction: { execute: typeof execute }) => Promise<T>
    ) => await callback({ execute }),
  };
};

describe("Asaas billing reconciliation", () => {
  it("maps Asaas events to canonical subscription statuses", () => {
    expect(
      mapAsaasSubscriptionStatus({
        billingType: "CREDIT_CARD",
        cardBrand: null,
        cardLast4: null,
        event: "PAYMENT_RECEIVED",
        externalReference: "billing-subscription-1",
        paymentId: "pay_1",
        paymentStatus: "RECEIVED",
        subscriptionId: "sub_1",
        subscriptionStatus: null,
        valueCents: 4900,
      })
    ).toBe("active");
    expect(
      mapAsaasSubscriptionStatus({
        billingType: "CREDIT_CARD",
        cardBrand: null,
        cardLast4: null,
        event: "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
        externalReference: "billing-subscription-1",
        paymentId: "pay_1",
        paymentStatus: "REFUSED",
        subscriptionId: "sub_1",
        subscriptionStatus: null,
        valueCents: 4900,
      })
    ).toBe("past_due");
  });

  it("reconciles payment events idempotently without storing full card data", async () => {
    const db = createDb();

    await expect(
      reconcileAsaasBillingEvent(
        db,
        {
          dateCreated: "2026-07-14 12:00:00",
          event: "PAYMENT_RECEIVED",
          id: "evt_1",
          payment: {
            billingType: "CREDIT_CARD",
            creditCard: {
              creditCardBrand: "VISA",
              creditCardNumber: "1234",
              creditCardToken: "token-secret",
            },
            externalReference:
              "billing-subscription:00000000-0000-0000-0000-000000000001",
            id: "pay_1",
            status: "RECEIVED",
            subscription: "sub_1",
            value: 49.9,
          },
        },
        "evt_1"
      )
    ).resolves.toBe("processed");

    expect(db.execute).toHaveBeenCalled();
    expect(source).toContain("billing_provider_links");
    expect(source).toContain("billing_payment_attempts");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("billing:organization:");
    expect(source).toContain("return await db.transaction");
    expect(source).toContain("from linked_invoice");
    expect(source).toContain("on conflict (provider, provider_event_id)");
    expect(source).toContain("last_provider_event_at <=");
    expect(source).toContain("grace_period_ends_at");
    expect(source).toContain("free_subscription.plan_id");
    expect(source).toContain("paid_subscription.plan_id");
    expect(source).toContain("PAID_MONTHLY_PLAN_ID");
    expect(source).toContain("card_last4");
    expect(source).not.toContain("creditCardToken");
    expect(source).not.toContain("cvv");
  });

  it("keeps events without subscription reference in manual review", async () => {
    await expect(
      reconcileAsaasBillingEvent(
        createDb(),
        {
          event: "PAYMENT_RECEIVED",
          id: "evt_1",
        },
        "evt_1"
      )
    ).resolves.toBe("review");
  });

  it("keeps status-changing events without a provider timestamp in manual review", async () => {
    await expect(
      reconcileAsaasBillingEvent(
        createDb(),
        {
          event: "PAYMENT_RECEIVED",
          payment: {
            externalReference:
              "billing-subscription:00000000-0000-0000-0000-000000000001",
          },
        },
        "evt_1"
      )
    ).resolves.toBe("review");
  });
});
