import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/components/settings/catalog-settings-panel", () => ({
  CatalogSettingsPanel: () => "CatalogSettingsPanel",
}));

vi.mock("@/components/settings/goals-settings-panel", () => ({
  GoalsSettingsPanel: () => "GoalsSettingsPanel",
}));

vi.mock("@/features/account/server", () => ({
  getAccountBillingSummary: vi.fn(async () => ({
    amountCents: 19_900,
    billingEmail: "billing@example.com",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: new Date("2026-08-10T12:00:00.000Z"),
    interval: "month",
    planName: "Polaris Start",
    status: "active",
  })),
}));

vi.mock("@/features/catalog/server", () => ({
  getCatalogSettings: vi.fn(async () => ({
    cardInstallmentRules: [{ feePercent: 0, installments: 1 }],
    idealMarkupPercent: 0,
    minimumMarkupPercent: 0,
  })),
  listCategoriesWithUsage: vi.fn(async () => []),
}));

vi.mock("@/features/dashboard/server", () => ({
  getDashboardDateBounds: vi.fn(async () => ({
    from: "2026-03-01",
    to: "2026-03-31",
  })),
}));

vi.mock("@/features/goals/server", () => ({
  getGoalsSettingsData: vi.fn(async () => ({
    active: [],
    history: [],
  })),
}));

vi.mock("@/lib/app-session", () => ({
  requireAppContext: vi.fn(async () => ({
    billingStatus: "active",
    hasBillableAccess: true,
    organizationId: "org_dg_imports",
    role: "owner",
    userId: "user-1",
  })),
}));

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(async () => ({
    user: {
      email: "owner@example.com",
      name: "Junior",
    },
  })),
}));

import ConfiguracoesPage from "@/app/(app)/configuracoes/page";

describe("ConfiguracoesPage", () => {
  it("renders account, goals, and catalog settings without exposing organization naming", async () => {
    const markup = renderToStaticMarkup(await ConfiguracoesPage());

    expect(markup).toContain("Minha conta");
    expect(markup).toContain("owner@example.com");
    expect(markup).toContain("GoalsSettingsPanel");
    expect(markup).toContain("CatalogSettingsPanel");
    expect(markup).not.toContain("Nome da organizacao");
    expect(markup).not.toContain("organizationName");
  });
});
