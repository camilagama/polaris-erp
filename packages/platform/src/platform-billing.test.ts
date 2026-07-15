import {
  getPlatformBillingOverview,
  updatePlatformBillingSubscriptionStatus,
} from "@polaris/platform/billing";
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

const createTxMock = () => {
  const returning = vi.fn().mockResolvedValue([
    {
      id: "subscription-1",
      organizationId: "org-1",
    },
  ]);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { insert, returning, set, update, values, where };
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
            billing_email: "billing-a@example.com",
            organization_id: "org_1",
            plan_name: "Pro",
            status: "ACTIVE",
            subscription_id: "subscription-1",
          },
          {
            current_period_end: null,
            billing_email: null,
            organization_id: "org_2",
            plan_name: "Starter",
            status: "provider_weird",
            subscription_id: "subscription-2",
          },
        ],
      },
      {
        rows: [
          {
            billing_email: "billing-a@example.com",
            created_at: "2026-07-09T00:00:00.000Z",
            organization_id: "org_1",
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
          billingEmail: "billing-a@example.com",
          organizationId: "org_1",
          status: "open",
          totalCents: 4900,
        },
      ],
      subscriptions: [
        {
          hasAccess: true,
          billingEmail: "billing-a@example.com",
          organizationId: "org_1",
          status: "active",
          subscriptionId: "subscription-1",
        },
        {
          hasAccess: false,
          organizationId: "org_2",
          status: "incomplete",
          subscriptionId: "subscription-2",
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

  it("requires a non-empty reason before changing subscription status", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      updatePlatformBillingSubscriptionStatus(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorAdminUserId: "user-1",
          reason: " ",
          status: "active",
          subscriptionId: "subscription-1",
        },
        db as never
      )
    ).rejects.toThrow("requires a reason");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("updates subscription status and writes platform audit in one transaction", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await updatePlatformBillingSubscriptionStatus(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorAdminUserId: "user-1",
        paymentEvidenceReference: "asaas-pay-1",
        reason: "payment confirmed manually",
        status: "active",
        subscriptionId: "subscription-1",
      },
      db as never
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
      })
    );
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.subscription.status_changed",
        actorPlatformAdminId: "platform-admin-1",
        actorAdminUserId: "user-1",
        metadata: {
          paymentEvidenceReference: "asaas-pay-1",
          reason: "payment confirmed manually",
          status: "active",
        },
        subjectId: "subscription-1",
        subjectType: "billing_subscription",
      })
    );
  });

  it("requires payment evidence before manually activating a subscription", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      updatePlatformBillingSubscriptionStatus(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorAdminUserId: "user-1",
          paymentEvidenceReference: " ",
          reason: "payment confirmed manually",
          status: "active",
          subscriptionId: "subscription-1",
        },
        db as never
      )
    ).rejects.toThrow("requires payment evidence");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects missing subscriptions without writing audit", async () => {
    const tx = createTxMock();
    tx.returning.mockResolvedValueOnce([]);
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      updatePlatformBillingSubscriptionStatus(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorAdminUserId: "user-1",
          reason: "payment reversed",
          status: "past_due",
          subscriptionId: "subscription-missing",
        },
        db as never
      )
    ).rejects.toThrow("Billing subscription not found for status change.");

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.values).not.toHaveBeenCalled();
  });
});
