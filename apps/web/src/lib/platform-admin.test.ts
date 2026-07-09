import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  bootstrapPlatformAdmin,
  recordPlatformAuditEvent,
} from "@/lib/platform-admin";

const createInsertMock = () => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));

  return { insert, values };
};

describe("platform admin helpers", () => {
  it("records platform audit events without requiring an organization id", async () => {
    const db = createInsertMock();

    await recordPlatformAuditEvent(db as never, {
      action: "platform_admin.bootstrap",
      actorUserId: "user-founder",
      metadata: { reason: "initial setup" },
      subjectId: "user-founder",
      subjectType: "platform_admin",
    });

    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.bootstrap",
        actorUserId: "user-founder",
        metadata: { reason: "initial setup" },
        subjectId: "user-founder",
        subjectType: "platform_admin",
      })
    );
    expect(db.values.mock.calls[0][0]).not.toHaveProperty("organizationId");
  });

  it("bootstraps a platform admin and writes the matching audit event in one transaction", async () => {
    const tx = createInsertMock();
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await bootstrapPlatformAdmin(db as never, {
      reason: "first internal operator",
      role: "owner",
      userId: "user-founder",
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledTimes(3);
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-founder",
      })
    );
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.bootstrap",
        actorUserId: "user-founder",
        subjectType: "platform_admin",
      })
    );
  });
});
