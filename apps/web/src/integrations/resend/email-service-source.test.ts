import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const emailServiceSource = readFileSync(
  join(process.cwd(), "src", "integrations", "resend", "email-service.ts"),
  "utf8"
);
const resendWebhookRoutePath = join(
  process.cwd(),
  "src",
  "app",
  "api",
  "webhooks",
  "resend",
  "route.ts"
);
const resendWebhookRouteSource = readFileSync(resendWebhookRoutePath, "utf8");
const resendWebhookHandlerSource = readFileSync(
  join(process.cwd(), "src", "integrations", "resend", "webhook.ts"),
  "utf8"
);

describe("email service and Resend webhook", () => {
  it("logs sends idempotently and rejects the Resend test domain in production", () => {
    expect(emailServiceSource).toContain("sendWelcomeEmail");
    expect(emailServiceSource).toContain("insert into email_messages");
    expect(emailServiceSource).toContain("on conflict (idempotency_key)");
    expect(emailServiceSource).toContain("provider_message_id");
    expect(emailServiceSource).toContain("status = 'accepted'");
    expect(emailServiceSource).toContain("accepted_at = now()");
    expect(emailServiceSource).toContain("attemptCount >= 3");
    expect(emailServiceSource).toContain("providerMessageId");
    expect(emailServiceSource).toContain("RESEND_FROM_EMAIL");
    expect(emailServiceSource).toContain("@resend\\.dev");
    expect(emailServiceSource).toContain("verified domain in production");
  });

  it("records Resend provider events idempotently with a redacted payload", () => {
    expect(emailServiceSource).toContain("recordResendEmailEvent");
    expect(emailServiceSource).toContain("insert into email_events");
    expect(emailServiceSource).toContain(
      "on conflict (provider, provider_event_id)"
    );
    expect(emailServiceSource).toContain("redactResendWebhookPayload");
    expect(emailServiceSource).toContain("emailId");
    expect(emailServiceSource).toContain("provider_occurred_at");
    expect(emailServiceSource).toContain("resolveResendEmailStatus");
  });

  it("validates Resend webhooks from raw body and svix headers", () => {
    expect(existsSync(resendWebhookRoutePath)).toBe(true);
    expect(resendWebhookRouteSource).toContain("handleResendWebhook");
    expect(resendWebhookRouteSource).not.toContain('from "@polaris/db"');
    expect(resendWebhookHandlerSource).toContain("readWebhookRequestBody");
    expect(resendWebhookHandlerSource).not.toContain("request.json()");
    expect(resendWebhookHandlerSource).toContain("svix-id");
    expect(resendWebhookHandlerSource).toContain("svix-timestamp");
    expect(resendWebhookHandlerSource).toContain("svix-signature");
    expect(resendWebhookHandlerSource).toContain("webhooks.verify");
    expect(resendWebhookHandlerSource).toContain("RESEND_WEBHOOK_SECRET");
    expect(resendWebhookHandlerSource).toContain("observeWebhookIntake");
    expect(resendWebhookHandlerSource).toContain("providerEventId");
    expect(resendWebhookHandlerSource).not.toContain("recordResendEmailEvent");
    expect(resendWebhookHandlerSource).not.toContain(
      "markWebhookIntakeProcessed"
    );
  });
});
