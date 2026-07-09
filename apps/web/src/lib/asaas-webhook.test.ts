import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  getAsaasWebhookEventId,
  redactAsaasWebhookPayload,
} from "@/lib/asaas-webhook";

vi.mock("server-only", () => ({}));

const routeSource = readFileSync(
  join(process.cwd(), "src", "app", "api", "webhooks", "asaas", "route.ts"),
  "utf8"
);
const handlerSource = readFileSync(
  join(process.cwd(), "src", "lib", "asaas-webhook.ts"),
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

  it("redacts card details to brand and last4 only", () => {
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
      event: "PAYMENT_RECEIVED",
      id: "evt_123",
      payment: {
        billingType: "CREDIT_CARD",
        id: "pay_123",
        status: "RECEIVED",
        subscription: "sub_123",
      },
      paymentMethod: {
        brand: "MASTERCARD",
        last4: "8829",
      },
      subscription: {
        id: null,
        status: null,
      },
    });
  });

  it("keeps the route thin and validates asaas-access-token", () => {
    expect(routeSource).toContain("handleAsaasWebhook");
    expect(routeSource).not.toContain('from "@/db"');
    expect(handlerSource).toContain("asaas-access-token");
    expect(handlerSource).toContain("ASAAS_WEBHOOK_TOKEN");
    expect(handlerSource).toContain("request.text()");
    expect(handlerSource).not.toContain("request.json()");
    expect(handlerSource).toContain("captureWebhookEvent");
    expect(handlerSource).toContain("reconcileAsaasBillingEvent");
    expect(handlerSource).toContain('provider: "asaas"');
  });
});
