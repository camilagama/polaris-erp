import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/app-session", () => ({
  requirePageAppContext: vi.fn(async () => ({
    organizationId: "org_dg_imports",
    organizationName: "Polaris",
    role: "owner",
    userId: "user-1",
  })),
}));

vi.mock("@/components/dashboard/dashboard-date-range-filter", () => ({
  DashboardDateRangeFilter: () => "DashboardDateRangeFilter",
}));

vi.mock("@/components/dashboard/goal-dashboard-compact-card", () => ({
  GoalDashboardCompactCard: () => "GoalDashboardCompactCard",
}));

vi.mock("@/components/dashboard/operational-costs-chart", () => ({
  OperationalCostsChart: () => "OperationalCostsChart",
}));

vi.mock("@/components/dashboard/profit-margin-chart", () => ({
  ProfitMarginChart: () => "ProfitMarginChart",
}));

vi.mock("@/components/dashboard/revenue-profit-chart", () => ({
  RevenueProfitChart: () => "RevenueProfitChart",
}));

vi.mock("@/components/dashboard/revenue-result-chart", () => ({
  RevenueResultChart: () => "RevenueResultChart",
}));

vi.mock("@/components/dashboard/sales-contribution-graph-card", () => ({
  SalesContributionGraphCard: () => "SalesContributionGraphCard",
}));

vi.mock("@/components/dashboard/sales-count-chart", () => ({
  SalesCountChart: () => "SalesCountChart",
}));

vi.mock("@/features/dashboard/date-range", () => ({
  dashboardDatePresetOptions: [],
  resolveDashboardDateRange: () => ({
    from: "2026-03-01",
    label: "Mar/2026",
    preset: "current-month",
    to: "2026-03-31",
  }),
}));

vi.mock("@/features/dashboard/server", () => ({
  getDashboardContributionGraph: vi.fn(async () => ({
    days: [
      {
        date: "2026-03-01",
        level: 1,
        salesCount: 1,
        sold: 100,
      },
    ],
    from: "2026-03-01",
    to: "2026-03-31",
    totalSalesCount: 1,
    totalSold: 100,
  })),
  getDashboardDateBounds: vi.fn(async () => ({
    from: "2026-03-01",
    to: "2026-03-31",
  })),
  getDashboardGlobalStats: vi.fn(async () => ({
    investment: 1000,
    profit: 250,
  })),
  getDashboardMetrics: vi.fn(async () => ({
    inventoryByCategory: [],
    periodComparison: [
      {
        costs: 40,
        label: "01/03",
        result: 60,
        salesCount: 1,
        sold: 100,
      },
    ],
    periodGranularity: "day",
    resultStatus: "profit",
    selectedRange: {
      from: "2026-03-01",
      to: "2026-03-31",
    },
    topProducts: [],
    totalCosts: 40,
    totalProductCosts: 25,
    totalResult: 60,
    totalSalesCount: 1,
    totalShippingAndSellerFees: 15,
    totalSold: 100,
  })),
}));

vi.mock("@/features/goals/server", () => ({
  getGoalsDashboardData: vi.fn(async () => ({
    active: [],
  })),
}));

vi.mock("@/features/products/image-urls", () => ({
  buildProductImageUrl: vi.fn(() => "/image"),
}));

import { DashboardContent } from "@/app/(app)/_components/dashboard-content";
import DashboardPage from "@/app/(app)/page";

describe("DashboardPage", () => {
  it("marks lower dashboard sections for deferred rendering and layout containment", async () => {
    const markup = renderToStaticMarkup(
      await DashboardContent({
        organizationId: "org_dg_imports",
        selectedRange: {
          from: "2026-03-01",
          to: "2026-03-31",
        },
      })
    );

    expect(markup).toContain("content-visibility:auto");
    expect(markup).toContain("contain-intrinsic-size:960px 640px");
    expect(markup).toContain("contain:layout");
  });

  it("renders the dashboard shell with a deferred content boundary", async () => {
    const markup = renderToStaticMarkup(
      await DashboardPage({
        searchParams: Promise.resolve({}),
      } as PageProps<"/">)
    );

    expect(markup).toContain("DashboardDateRangeFilter");
  });
});
