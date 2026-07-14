import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSalesListPage } from "@/features/sales/list-page";

const salesListPageMocks = vi.hoisted(() => ({
  getCatalogSettings: vi.fn(),
  getSalesAnalytics: vi.fn(),
  getSalesDateBounds: vi.fn(),
  getSalesQuery: vi.fn(),
  requirePageAppContext: vi.fn(),
  resolveSalesDateRange: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/app-session", () => ({
  requirePageAppContext: salesListPageMocks.requirePageAppContext,
}));

vi.mock("@/features/catalog/server", () => ({
  getCatalogSettings: salesListPageMocks.getCatalogSettings,
}));

vi.mock("@/features/sales/date-range", () => ({
  resolveSalesDateRange: salesListPageMocks.resolveSalesDateRange,
}));

vi.mock("@/features/sales/queries", () => ({
  getSalesQuery: salesListPageMocks.getSalesQuery,
}));

vi.mock("@/features/sales/server", () => ({
  getSalesAnalytics: salesListPageMocks.getSalesAnalytics,
  getSalesDateBounds: salesListPageMocks.getSalesDateBounds,
}));

describe("loadSalesListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    salesListPageMocks.requirePageAppContext.mockResolvedValue({
      organizationId: "org_dg_imports",
      role: "owner",
    });
    salesListPageMocks.getSalesDateBounds.mockResolvedValue({
      from: "2026-03-01",
      to: "2026-03-31",
    });
    salesListPageMocks.resolveSalesDateRange.mockReturnValue({
      from: "2026-03-10",
      preset: "month",
      to: "2026-03-31",
    });
    salesListPageMocks.getSalesQuery.mockResolvedValue({
      items: [{ id: "sale-1" }],
      nextCursor: "cursor-2",
    });
    salesListPageMocks.getSalesAnalytics.mockResolvedValue({
      totalSales: 100,
    });
    salesListPageMocks.getCatalogSettings.mockResolvedValue({
      cardInstallmentRules: [{ feePercent: 0, installments: 1 }],
    });
  });

  it("assembles the sales panel data contract from search params and organization context", async () => {
    const pageData = await loadSalesListPage({
      q: "  cliente  ",
      status: "completed",
    });

    expect(salesListPageMocks.getSalesDateBounds).toHaveBeenCalledWith(
      "org_dg_imports"
    );
    expect(salesListPageMocks.resolveSalesDateRange).toHaveBeenCalledWith({
      bounds: { from: "2026-03-01", to: "2026-03-31" },
      searchParams: {
        q: "  cliente  ",
        status: "completed",
      },
    });
    expect(salesListPageMocks.getSalesQuery).toHaveBeenCalledWith({
      organizationId: "org_dg_imports",
      query: "cliente",
      status: "completed",
    });
    expect(salesListPageMocks.getSalesAnalytics).toHaveBeenCalledWith({
      from: "2026-03-10",
      organizationId: "org_dg_imports",
      to: "2026-03-31",
    });
    expect(pageData).toEqual({
      analytics: { totalSales: 100 },
      appliedQuery: "cliente",
      cardInstallmentRules: [{ feePercent: 0, installments: 1 }],
      dateBounds: { from: "2026-03-01", to: "2026-03-31" },
      initialCursor: "cursor-2",
      role: "owner",
      sales: [{ id: "sale-1" }],
      selectedRange: {
        from: "2026-03-10",
        preset: "month",
        to: "2026-03-31",
      },
      status: "completed",
    });
  });

  it("normalizes unsupported filters before querying sales", async () => {
    await loadSalesListPage({
      q: ["ignored"],
      status: "unknown",
    });

    expect(salesListPageMocks.getSalesQuery).toHaveBeenCalledWith({
      organizationId: "org_dg_imports",
      query: "",
      status: "all",
    });
  });
});
