import { describe, expect, it, vi } from "vitest";
import { updatePlatformOrganizationStatus } from "@/lib/platform-organization-mutations";

vi.mock("server-only", () => ({}));

const createTxMock = () => {
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { insert, set, update, values, where };
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
