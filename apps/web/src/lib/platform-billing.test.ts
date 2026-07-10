import { getPlatformBillingOverview } from "@polaris/platform/billing";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { withPlatformAdminContextMock } = vi.hoisted(() => ({
  withPlatformAdminContextMock: vi.fn(),
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withPlatformAdminContext: withPlatformAdminContextMock,
}));

const createDb = (results: unknown[]) => {
  const execute = vi.fn(async () => results.shift());

  return { execute };
};

describe("platform billing overview", () => {
  it("runs admin billing reads inside platform admin DB context", async () => {
    const db = createDb([{ rows: [] }, { rows: [] }, { rows: [] }]);
    withPlatformAdminContextMock.mockImplementationOnce(
      async (_platformAdminId, callback) => callback(db)
    );

    const { getPlatformBillingOverviewForAdmin } = await import(
      "@polaris/platform/billing"
    );

    await expect(
      getPlatformBillingOverviewForAdmin("platform-admin-1")
    ).resolves.toMatchObject({
      invoices: [],
      subscriptions: [],
    });
    expect(withPlatformAdminContextMock).toHaveBeenCalledWith(
      "platform-admin-1",
      expect.any(Function)
    );
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it("returns canonical read-only billing data for admin", async () => {
    const db = createDb([
      {
        rows: [
          {
            current_period_end: "2026-08-01T00:00:00.000Z",
            organization_id: "org_1",
            organization_name: "Importadora Azul",
            plan_name: "Pro",
            status: "ACTIVE",
          },
          {
            current_period_end: null,
            organization_id: "org_2",
            organization_name: "Importadora Cinza",
            plan_name: "Starter",
            status: "provider_weird",
          },
        ],
      },
      {
        rows: [
          {
            created_at: "2026-07-09T00:00:00.000Z",
            organization_name: "Importadora Azul",
            status: "open",
            total_cents: "4900",
          },
        ],
      },
      {
        rows: [
          {
            active_access_subscriptions: "1",
            open_invoices: "1",
            subscriptions: "2",
          },
        ],
      },
    ]);

    await expect(getPlatformBillingOverview(db)).resolves.toMatchObject({
      invoices: [
        {
          organizationName: "Importadora Azul",
          status: "open",
          totalCents: 4900,
        },
      ],
      subscriptions: [
        {
          hasAccess: true,
          organizationId: "org_1",
          status: "active",
        },
        {
          hasAccess: false,
          organizationId: "org_2",
          status: "incomplete",
        },
      ],
      totals: {
        activeAccessSubscriptions: 1,
        openInvoices: 1,
        subscriptions: 2,
      },
    });
    expect(db.execute).toHaveBeenCalledTimes(3);
  });
});
