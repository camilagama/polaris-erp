import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  getWooviWebhookEventId,
  redactWooviWebhookPayload,
  verifyWooviWebhookSignature,
} from "@/integrations/woovi/webhook";

vi.mock("server-only", () => ({}));

const routeSource = readFileSync(
  join(process.cwd(), "src", "app", "api", "webhooks", "woovi", "route.ts"),
  "utf8"
);
const handlerSource = readFileSync(
  join(process.cwd(), "src", "integrations", "woovi", "webhook.ts"),
  "utf8"
);

describe("Woovi webhook foundation", () => {
  it("verifies raw payload signatures from x-webhook-signature", () => {
    const rawBody = JSON.stringify({ event: "PIX_AUTOMATIC_APPROVED" });
    const signature = createHmac("sha256", "secret")
      .update(rawBody)
      .digest("hex");

    expect(
      verifyWooviWebhookSignature({ rawBody, secret: "secret", signature })
    ).toBe(true);
    expect(
      verifyWooviWebhookSignature({
        rawBody,
        secret: "wrong",
        signature,
      })
    ).toBe(false);
  });

  it("uses stable Woovi identifiers for idempotency", () => {
    expect(
      getWooviWebhookEventId({
        correlationID: "corr-1",
        event: "PIX_AUTOMATIC_APPROVED",
        globalID: "global-1",
        paymentSubscriptionGlobalID: "subscription-1",
      })
    ).toBe("global-1");
    expect(
      getWooviWebhookEventId({
        cobr: { identifierId: "cobr-1" },
        correlationID: "corr-1",
      })
    ).toBe("cobr-1");
  });

  it("redacts customer payload details before persistence", () => {
    expect(
      redactWooviWebhookPayload({
        correlationID: "corr-1",
        customer: { email: "cliente@example.com", taxID: "12345678900" },
        event: "PIX_AUTOMATIC_APPROVED",
        status: "ACTIVE",
      })
    ).toEqual({
      correlationID: "corr-1",
      event: "PIX_AUTOMATIC_APPROVED",
      globalID: null,
      paymentSubscriptionGlobalID: null,
      status: "ACTIVE",
    });
  });

  it("keeps the route thin and validates raw body plus x-webhook-signature", () => {
    expect(routeSource).toContain("handleWooviWebhook");
    expect(routeSource).not.toContain('from "@polaris/db"');
    expect(handlerSource).toContain("request.text()");
    expect(handlerSource).not.toContain("request.json()");
    expect(handlerSource).toContain("x-webhook-signature");
    expect(handlerSource).toContain("observeWebhookIntake");
    expect(handlerSource).not.toContain("sendOutboxEventToInngest");
    expect(handlerSource).toContain("markWebhookIntakeProcessed");
    expect(handlerSource).toContain("withInternalJobContext");
    expect(handlerSource).toContain("billing_webhook_reconcile");
    expect(handlerSource).toContain('provider: "woovi"');
  });
});
