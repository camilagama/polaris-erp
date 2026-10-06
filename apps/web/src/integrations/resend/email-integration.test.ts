import { createResendEmailSender, renderWelcomeEmail } from "@polaris/emails";
import { describe, expect, it, vi } from "vitest";
import {
  redactResendWebhookPayload,
  resolveResendEmailStatus,
} from "@/integrations/resend/email-service";

vi.mock("server-only", () => ({}));

describe("@polaris/emails", () => {
  it.each([
    ["email.delivered", "delivered"],
    ["email.bounced", "bounced"],
    ["email.complained", "suppressed"],
    ["email.suppressed", "suppressed"],
    ["email.sent", "accepted"],
    ["email.unknown", null],
  ] as const)(
    "maps %s to the internal delivery state %s",
    (eventType, status) => {
      expect(resolveResendEmailStatus(eventType)).toBe(status);
    }
  );

  it("renders a versioned welcome template", () => {
    const email = renderWelcomeEmail({
      appUrl: "https://app.example.com",
      name: "Junior",
    });

    expect(email).toMatchObject({
      html: expect.stringContaining("Junior"),
      subject: "Bem-vindo ao Polaris",
      template: "welcome",
      templateVersion: "2026-07-09",
      text: expect.stringContaining("https://app.example.com"),
    });
  });

  it("keeps only delivery metadata from provider webhooks", () => {
    expect(
      redactResendWebhookPayload({
        created_at: "2026-07-14T15:00:00.000Z",
        data: {
          email_id: "email_123",
          from: "sender@example.com",
          subject: "Sensitive subject",
          to: ["recipient@example.com"],
        },
        type: "email.delivered",
      })
    ).toEqual({
      data: { emailId: "email_123" },
      occurredAt: "2026-07-14T15:00:00.000Z",
      type: "email.delivered",
    });
  });

  it("sends through Resend with idempotency and handles { data, error }", async () => {
    const send = vi.fn().mockResolvedValueOnce({
      data: { id: "email_123" },
      error: null,
    });
    const sender = createResendEmailSender({
      from: "Polaris <onboarding@resend.dev>",
      resend: { emails: { send } },
    });

    await expect(
      sender.send({
        idempotencyKey: "welcome:user-1",
        template: renderWelcomeEmail({
          appUrl: "https://app.example.com",
          name: "Junior",
        }),
        to: "junior@example.com",
      })
    ).resolves.toEqual({ providerMessageId: "email_123" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Polaris <onboarding@resend.dev>",
        to: ["junior@example.com"],
      }),
      { idempotencyKey: "welcome:user-1" }
    );
  });

  it("throws when Resend returns error", async () => {
    const sender = createResendEmailSender({
      from: "Polaris <onboarding@resend.dev>",
      resend: {
        emails: {
          send: vi.fn().mockResolvedValueOnce({
            data: null,
            error: { message: "failed" },
          }),
        },
      },
    });

    await expect(
      sender.send({
        idempotencyKey: "welcome:user-1",
        template: renderWelcomeEmail({
          appUrl: "https://app.example.com",
          name: "Junior",
        }),
        to: "junior@example.com",
      })
    ).rejects.toThrow("failed");
  });
});
