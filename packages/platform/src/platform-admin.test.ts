import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  bootstrapPlatformAdmin,
  createPlatformAdminEnrollment,
  grantPlatformAdminAccess,
  listPlatformAdminGrants,
  recordPlatformAuditEvent,
  revokePlatformAdminGrant,
} from "@polaris/platform/admin";

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
      actorAdminUserId: "admin-founder",
      metadata: { reason: "initial setup" },
      subjectId: "user-founder",
      subjectType: "platform_admin",
    });

    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.bootstrap",
        actorAdminUserId: "admin-founder",
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

    await bootstrapPlatformAdmin(
      {
        expiresAt: new Date(Date.now() + 60_000),
        reason: "first internal operator",
        role: "owner",
        adminUserId: "admin-founder",
      },
      db as never
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledTimes(3);
    expect(tx.values).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        expiresAt: expect.any(Date),
        platformAdminId: expect.any(String),
        reason: "first internal operator",
        role: "owner",
      })
    );
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.bootstrap",
        actorAdminUserId: "admin-founder",
        subjectType: "platform_admin",
      })
    );
  });

  it("rejects a bootstrap grant that is already expired", () => {
    const db = {
      transaction: vi.fn(),
    };

    expect(() =>
      bootstrapPlatformAdmin(
        {
          expiresAt: new Date(0),
          reason: "first internal operator",
          role: "owner",
          adminUserId: "admin-founder",
        },
        db as never
      )
    ).toThrow("Platform admin bootstrap requires a future grant expiration.");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("creates a time-bound owner-approved grant and audit event atomically", async () => {
    const tx = {
      ...createInsertMock(),
      execute: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: "platform-admin-2" }] })
        .mockResolvedValueOnce({ rows: [{ id: "grant-2" }] }),
    };
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };

    await grantPlatformAdminAccess(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorAdminUserId: "owner-admin",
        expiresAt: new Date(Date.now() + 60_000),
        reason: "Temporary support coverage.",
        role: "support",
        targetAdminUserId: "support-admin",
      },
      db as never
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.execute).toHaveBeenCalledTimes(2);
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.granted",
        actorPlatformAdminId: "platform-admin-1",
        subjectId: "grant-2",
        subjectType: "platform_admin_grant",
      })
    );
  });

  it("creates a pre-approved enrollment by exact normalized email", async () => {
    const tx = {
      ...createInsertMock(),
      execute: vi.fn().mockResolvedValueOnce({ rows: [{ id: "enrollment-1" }] }),
    };
    const db = { transaction: vi.fn(async (callback) => callback(tx)) };

    await createPlatformAdminEnrollment(
      {
        actorAdminUserId: "owner-admin",
        actorPlatformAdminId: "platform-admin-1",
        email: "  CONTACTO@AGENCIA.COM ",
        enrollmentExpiresAt: new Date(Date.now() + 60_000),
        grantExpiresAt: new Date(Date.now() + 120_000),
        reason: "Temporary support coverage.",
        role: "support",
      },
      db as never
    );

    expect(tx.execute).toHaveBeenCalledOnce();
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.enrollment_created",
        metadata: expect.objectContaining({ email: "contacto@agencia.com" }),
        subjectId: "enrollment-1",
      })
    );
  });

  it("rejects a permanent or unexplained grant before opening a transaction", () => {
    const db = { transaction: vi.fn() };

    expect(() =>
      grantPlatformAdminAccess(
        {
          actorPlatformAdminId: "platform-admin-1",
          actorAdminUserId: "owner-admin",
          expiresAt: new Date(0),
          reason: " ",
          role: "support",
          targetAdminUserId: "support-admin",
        },
        db as never
      )
    ).toThrow("requires a reason");

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("revokes an active grant with a reason and matching audit event", async () => {
    const tx = {
      ...createInsertMock(),
      execute: vi
        .fn()
        .mockResolvedValue({ rows: [{ platform_admin_id: "admin-2" }] }),
    };
    const db = { transaction: vi.fn(async (callback) => callback(tx)) };

    await revokePlatformAdminGrant(
      {
        actorPlatformAdminId: "platform-admin-1",
        actorAdminUserId: "owner-admin",
        grantId: "grant-2",
        reason: "Coverage window ended.",
      },
      db as never
    );

    expect(tx.execute).toHaveBeenCalledOnce();
    expect(tx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.grant_revoked",
        subjectId: "grant-2",
      })
    );
  });

  it("lists grants without joining user PII", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          expires_at: new Date("2026-08-01T00:00:00.000Z"),
          grant_id: "grant-2",
          platform_admin_id: "admin-2",
          reason: "Temporary support coverage.",
          revoked_at: null,
          role: "support",
          admin_user_id: "support-admin",
        },
      ],
    });

    const grants = await listPlatformAdminGrants({ execute });

    expect(grants).toEqual([
      {
        expiresAt: "2026-08-01T00:00:00.000Z",
        grantId: "grant-2",
        platformAdminId: "admin-2",
        reason: "Temporary support coverage.",
        revokedAt: null,
        role: "support",
        adminUserId: "support-admin",
      },
    ]);
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).not.toContain("email");
  });
});
