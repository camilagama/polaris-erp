import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/app-session", () => ({
  getAppContext: vi.fn(async () => ({
    billingStatus: "incomplete",
    hasBillableAccess: false,
    organizationId: "org_dg_imports",
    organizationName: "DG Imports",
    role: "owner",
    userId: "user-1",
  })),
}));

vi.mock("@/lib/env", () => ({
  serverEnv: {
    SUPPORT_EMAIL: "billing-support@example.com",
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => ({
    user: {
      email: "owner@example.com",
      name: "Junior",
    },
  })),
}));

import BillingRequiredPage from "@/app/billing-required/page";

describe("BillingRequiredPage", () => {
  it("renders configured support email for manual subscription activation", async () => {
    const markup = renderToStaticMarkup(await BillingRequiredPage());

    expect(markup).toContain("Assinatura necessaria");
    expect(markup).toContain("Status atual: incomplete");
    expect(markup).toContain("billing-support@example.com");
    expect(markup).toContain(
      "mailto:billing-support@example.com?subject=Ativar%20assinatura%20Polaris"
    );
    expect(markup).not.toContain("suporte@polaris.local");
  });
});
