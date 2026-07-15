import {
  closePlatformOrganization,
  updatePlatformOrganizationStatus,
} from "@polaris/platform/organization-mutations";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createTxMock = () => {
  const returning = vi.fn().mockResolvedValue([{ id: "org-1" }]);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  const execute = vi.fn().mockResolvedValue({ rows: [] });

  return { execute, insert, returning, set, update, values, where };
};

describe("updatePlatformOrganizationStatus", () => {
  it("requires a non-empty reason", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      updatePlatformOrganizationStatus(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorUserId: "user-1",
          organizationId: "org-1",
          reason: " ",
          status: "suspended",
        },
        db as never
      )
    ).rejects.toThrow("requires a reason");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects unsupported statuses before opening a transaction", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      updatePlatformOrganizationStatus(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorUserId: "user-1",
          organizationId: "org-1",
          reason: "fraud review",
          status: "deleted" as never,
        },
        db as never
      )
    ).rejects.toThrow("Unsupported organization status.");

    expect(db.transaction).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("updates organization status and writes status plus revocation audits in one transaction", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await updatePlatformOrganizationStatus(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        organizationId: "org-1",
        reason: "fraud review",
        status: "suspended",
      },
      db as never
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "suspended",
      })
    );
    expect(tx.returning).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "organization.status_changed",
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        metadata: {
          reason: "fraud review",
          status: "suspended",
        },
        subjectId: "org-1",
        subjectType: "organization",
      })
    );
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.sessions_revoked",
        metadata: {
          reason: "organization_suspended",
        },
        subjectId: "org-1",
        subjectType: "organization",
      })
    );
  });

  it("expires every tenant session in the suspension transaction", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await updatePlatformOrganizationStatus(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        organizationId: "org-1",
        reason: "fraud review",
        status: "suspended",
      },
      db as never
    );

    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: expect.any(Date),
      })
    );
  });

  it("rejects missing organizations without writing a platform audit event", async () => {
    const tx = createTxMock();
    tx.returning.mockResolvedValueOnce([]);
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      updatePlatformOrganizationStatus(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorUserId: "user-1",
          organizationId: "org-missing",
          reason: "fraud review",
          status: "suspended",
        },
        db as never
      )
    ).rejects.toThrow("Organization not found for status change.");

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.values).not.toHaveBeenCalled();
  });

  it("rejects when audit insertion fails after the status update", async () => {
    const tx = createTxMock();
    tx.values.mockRejectedValueOnce(new Error("audit failed"));
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await expect(
      updatePlatformOrganizationStatus(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorUserId: "user-1",
          organizationId: "org-1",
          reason: "customer asked",
          status: "active",
        },
        db as never
      )
    ).rejects.toThrow("audit failed");

    expect(db.transaction).toHaveBeenCalledOnce();
  });

  it("closes access immediately and enqueues provider cancellation once", async () => {
    const tx = createTxMock();
    tx.execute
      .mockResolvedValueOnce({
        rows: [
          {
            provider: "asaas",
            providerSubscriptionId: "sub-provider-1",
            subscriptionId: "sub-1",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: "sub-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "outbox-1" }] });
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await closePlatformOrganization(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        organizationId: "org-1",
        reason: "Customer requested account closure.",
      },
      db as never
    );

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "suspended" })
    );
    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: expect.any(Date) })
    );
    expect(tx.execute).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(tx.execute.mock.calls[2]?.[0])).toContain(
      "organization-closure-cancel:org-1:sub-1"
    );
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "organization.closure_requested",
        metadata: expect.objectContaining({
          providerCancellationRequested: true,
          subscriptionId: "sub-1",
        }),
      })
    );
  });

  it("closes Free or manually billed organizations without a provider cancellation", async () => {
    const tx = createTxMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await closePlatformOrganization(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorUserId: "user-1",
        organizationId: "org-1",
        reason: "Customer requested account closure.",
      },
      db as never
    );

    expect(tx.execute).toHaveBeenCalledOnce();
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "organization.closure_requested",
        metadata: expect.objectContaining({
          providerCancellationRequested: false,
          subscriptionId: null,
        }),
      })
    );
  });
});
