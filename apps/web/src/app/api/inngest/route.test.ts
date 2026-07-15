import { afterEach, describe, expect, it, vi } from "vitest";

const {
  billingLifecycleInngestFunctions,
  goalResolutionInngestFunctions,
  inngestFunctions,
  productImageInngestFunctions,
  serveMock,
  stockLedgerInngestFunctions,
} = vi.hoisted(() => ({
  billingLifecycleInngestFunctions: [{ id: "billing-lifecycle" }],
  goalResolutionInngestFunctions: [{ id: "goal-resolution" }],
  inngestFunctions: [{ id: "outbox" }],
  productImageInngestFunctions: [{ id: "product-image" }],
  serveMock: vi.fn(() => ({})),
  stockLedgerInngestFunctions: [{ id: "stock-ledger" }],
}));

vi.mock("inngest/next", () => ({ serve: serveMock }));
vi.mock("@/features/goals/goal-resolution-inngest", () => ({
  goalResolutionInngestFunctions,
}));
vi.mock("@/features/products/image-reconcile-inngest", () => ({
  productImageInngestFunctions,
}));
vi.mock("@/features/products/ledger-reconciliation-inngest", () => ({
  stockLedgerInngestFunctions,
}));
vi.mock("@/integrations/billing/lifecycle-inngest", () => ({
  billingLifecycleInngestFunctions,
}));
vi.mock("@/lib/inngest-client", () => ({ inngest: {} }));
vi.mock("@/lib/inngest-functions", () => ({ inngestFunctions }));

describe("Inngest route", () => {
  afterEach(() => {
    serveMock.mockClear();
    vi.resetModules();
  });

  it("registers the stock-ledger reconciliation job", async () => {
    await import("@/app/api/inngest/route");

    expect(serveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functions: expect.arrayContaining(stockLedgerInngestFunctions),
      })
    );
  });
});
