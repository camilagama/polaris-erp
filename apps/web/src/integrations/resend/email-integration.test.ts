import { createResendEmailSender, renderWelcomeEmail } from "@polaris/emails";
import { describe, expect, it, vi } from "vitest";

describe("@polaris/emails", () => {
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
