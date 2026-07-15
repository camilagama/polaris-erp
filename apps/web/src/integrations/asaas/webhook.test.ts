import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  getAsaasWebhookEventId,
  redactAsaasWebhookPayload,
} from "@/integrations/asaas/webhook";

vi.mock("server-only", () => ({}));

const routeSource = readFileSync(
  join(process.cwd(), "src", "app", "api", "webhooks", "asaas", "route.ts"),
  "utf8"
);
const handlerSource = readFileSync(
  join(process.cwd(), "src", "integrations", "asaas", "webhook.ts"),
  "utf8"
);

describe("Asaas webhook foundation", () => {
  it("uses event ids for idempotency", () => {
    expect(
      getAsaasWebhookEventId({
        event: "PAYMENT_RECEIVED",
        id: "evt_123",
        payment: { id: "pay_123" },
      })
    ).toBe("evt_123");
  });

  it("redacts card details while retaining only billing reconciliation metadata", () => {
    expect(
      redactAsaasWebhookPayload({
        event: "PAYMENT_RECEIVED",
        id: "evt_123",
        payment: {
          billingType: "CREDIT_CARD",
          creditCard: {
            creditCardBrand: "MASTERCARD",
            creditCardNumber: "8829",
            creditCardToken: "token-secret",
          },
          id: "pay_123",
          status: "RECEIVED",
          subscription: "sub_123",
        },
      })
    ).toEqual({
      dateCreated: null,
      event: "PAYMENT_RECEIVED",
      id: "evt_123",
      payment: {
        billingType: "CREDIT_CARD",
        externalReference: null,
        id: "pay_123",
        status: "RECEIVED",
        subscription: "sub_123",
        value: null,
      },
      paymentMethod: {
        brand: "MASTERCARD",
        last4: "8829",
      },
      subscription: {
        externalReference: null,
        id: null,
        status: null,
        value: null,
      },
    });
  });

  it("keeps the route thin and validates asaas-access-token", () => {
    expect(routeSource).toContain("handleAsaasWebhook");
    expect(routeSource).not.toContain('from "@polaris/db"');
    expect(handlerSource).toContain("asaas-access-token");
    expect(handlerSource).toContain("ASAAS_WEBHOOK_TOKEN");
    expect(handlerSource).toContain("readWebhookRequestBody");
    expect(handlerSource).not.toContain("request.json()");
    expect(handlerSource).toContain("observeWebhookIntake");
    expect(handlerSource).not.toContain("sendOutboxEventToInngest");
    expect(handlerSource).not.toContain("markWebhookIntakeProcessed");
    expect(handlerSource).not.toContain("reconcileAsaasBillingEvent");
    expect(handlerSource).not.toContain("withInternalJobContext");
    expect(handlerSource).toContain('provider: "asaas"');
  });
});
