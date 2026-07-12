import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountSettingsPanel } from "@/components/settings/account-settings-panel";

describe("AccountSettingsPanel", () => {
  it("renders one-user account, billing, and support details without workspace naming", () => {
    const markup = renderToStaticMarkup(
      AccountSettingsPanel({
        billing: {
          amountCents: 19_900,
          billingEmail: "billing@example.com",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date("2026-08-10T12:00:00.000Z"),
          interval: "month",
          planName: "Polaris Start",
          status: "active",
        },
        user: {
          email: "owner@example.com",
          name: "Junior",
          role: "owner",
        },
        supportEmail: "billing-support@example.com",
      })
    );

    expect(markup).toContain("Minha conta");
    expect(markup).toContain("Junior");
    expect(markup).toContain("owner@example.com");
    expect(markup).toContain("Ativa");
    expect(markup).toContain("Polaris Start");
    expect(markup).toContain("199,00");
    expect(markup).toContain("billing@example.com");
    expect(markup).toContain("billing-support@example.com");
    expect(markup).toContain(
      "mailto:billing-support@example.com?subject=Suporte%20Polaris"
    );
    expect(markup).not.toContain("organizationName");
    expect(markup).not.toContain("workspace");
    expect(markup).not.toContain("canal de suporte");
  });
});
