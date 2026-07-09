// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SalesPanel } from "@/components/sales/sales-panel";
import type { SaleListItem, SalesAnalytics } from "@/features/sales/contracts";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const salesMocks = vi.hoisted(() => ({
  loadMoreSalesAction: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/features/sales/pagination", () => ({
  loadMoreSalesAction: salesMocks.loadMoreSalesAction,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    error: salesMocks.toastError,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/vendas",
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@/components/dashboard/dashboard-date-range-filter", () => ({
  DashboardDateRangeFilter: () => null,
}));

vi.mock("@/components/sales/create-sale-dialog", () => ({
  CreateSaleDialog: () => null,
}));

vi.mock("@/components/sales/payment-method-chart", () => ({
  PaymentMethodChart: () => null,
}));

vi.mock("@/components/sales/sales-performance-chart", () => ({
  SalesPerformanceChart: () => null,
}));

vi.mock("@/components/sales/sales-status-chart", () => ({
  SalesStatusChart: () => null,
}));

const analytics: SalesAnalytics = {
  averageTicket: 20,
  cancelledSalesCount: 0,
  completedSalesCount: 1,
  paymentMethods: [],
  performance: [],
  periodGranularity: "day",
  profitMarginPercent: 0,
  statusSummary: [],
  topPaymentMethod: null,
  totalProfit: 0,
  totalSold: 20,
};

const sale: SaleListItem = {
  additionalAmount: "0.00",
  cancelledAt: null,
  chargedAmount: "20.00",
  customerName: "Cliente teste",
  discountAmount: "0.00",
  feeAmount: "0.00",
  freightAmount: "0.00",
  id: "sale-1",
  itemCount: 1,
  occurredOn: "2026-03-31",
  paymentFeePayer: "not_applicable",
  paymentFeePercent: "0.00",
  paymentInstallments: 0,
  paymentMethod: "pix",
  status: "completed",
  totalAmount: "20.00",
};

describe("SalesPanel", () => {
  afterEach(() => {
    salesMocks.loadMoreSalesAction.mockReset();
    salesMocks.toastError.mockReset();
    document.body.innerHTML = "";
  });

  it("shows feedback and releases the load-more button when pagination fails", async () => {
    salesMocks.loadMoreSalesAction.mockRejectedValueOnce(
      new Error("Falha ao carregar vendas")
    );

    const container = document.createElement("div");
    document.body.append(container);

    const root: Root = createRoot(container);
    act(() => {
      root.render(
        createElement(SalesPanel, {
          analytics,
          appliedQuery: "",
          cardInstallmentRules: [],
          dateBounds: {
            from: "2026-03-01",
            to: "2026-03-31",
          },
          initialCursor: "cursor-1",
          role: "operator",
          saleProducts: [],
          sales: [sale],
          selectedRange: {
            from: "2026-03-01",
            label: "Marco de 2026",
            preset: null,
            to: "2026-03-31",
          },
          status: "all",
        })
      );
    });

    const loadMoreButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Carregar mais vendas"
    );

    expect(loadMoreButton).toBeTruthy();

    await act(async () => {
      loadMoreButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });

    expect(salesMocks.toastError).toHaveBeenCalledWith(
      "Falha ao carregar vendas"
    );
    expect(loadMoreButton?.textContent).toBe("Carregar mais vendas");
    expect(loadMoreButton?.hasAttribute("disabled")).toBe(false);

    act(() => {
      root.unmount();
    });
  });

  it("labels the sales search and status filters for assistive technologies", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const root: Root = createRoot(container);
    act(() => {
      root.render(
        createElement(SalesPanel, {
          analytics,
          appliedQuery: "",
          cardInstallmentRules: [],
          dateBounds: {
            from: "2026-03-01",
            to: "2026-03-31",
          },
          initialCursor: null,
          role: "operator",
          saleProducts: [],
          sales: [sale],
          selectedRange: {
            from: "2026-03-01",
            label: "Marco de 2026",
            preset: null,
            to: "2026-03-31",
          },
          status: "all",
        })
      );
    });

    const searchLabel = container.querySelector('label[for="sales-search"]');
    const searchInput = container.querySelector("#sales-search");
    const statusTrigger = container.querySelector("#sales-status-filter");

    expect(searchLabel?.textContent).toBe("Buscar vendas");
    expect(searchInput).toBeInstanceOf(HTMLInputElement);
    expect(statusTrigger?.getAttribute("aria-label")).toBe(
      "Filtrar vendas por status"
    );

    act(() => {
      root.unmount();
    });
  });
});
