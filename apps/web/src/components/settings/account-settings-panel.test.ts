import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountSettingsPanel } from "@/components/settings/account-settings-panel";

describe("AccountSettingsPanel", () => {
  it("renders one-user account, billing, and support details without organization naming", () => {
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
      })
    );

    expect(markup).toContain("Minha conta");
    expect(markup).toContain("Junior");
    expect(markup).toContain("owner@example.com");
    expect(markup).toContain("Ativa");
    expect(markup).toContain("Polaris Start");
    expect(markup).toContain("199,00");
    expect(markup).toContain("billing@example.com");
    expect(markup).not.toContain("Nome da organizacao");
    expect(markup).not.toContain("organizationName");
  });
});
