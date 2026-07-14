import { updatePlatformOrganizationStatus } from "@polaris/platform/organization-mutations";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createTxMock = () => {
  const returning = vi.fn().mockResolvedValue([{ id: "org-1" }]);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { insert, returning, set, update, values, where };
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

  it("updates organization status and writes platform audit in one transaction", async () => {
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
});
