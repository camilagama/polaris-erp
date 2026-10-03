import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, insert, values, withInternalJobContext } = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  const execute = vi.fn();
  const withInternalJobContext = vi.fn(
    async (_capability: string, callback: (tx: unknown) => unknown) =>
      callback({ execute, insert })
  );

  return { execute, insert, values, withInternalJobContext };
});

vi.mock("server-only", () => ({}));
vi.mock("@polaris/db/tenant-context", () => ({ withInternalJobContext }));

import { admitPlatformAdminSession } from "@polaris/platform/admin";

const futureGrantExpiration = (): Date => new Date(Date.now() + 60_000);

describe("platform admin admission", () => {
  beforeEach(() => {
    execute.mockReset();
    insert.mockClear();
    values.mockReset();
    withInternalJobContext.mockClear();
  });

  it("returns when the identity already has an active grant", async () => {
    execute.mockResolvedValueOnce({ rows: [{ id: "admin-1" }] });

    await admitPlatformAdminSession("user-1");

    expect(execute).toHaveBeenCalledOnce();
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects when the identity has no active enrollment", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(admitPlatformAdminSession("user-1")).rejects.toThrow(
      "does not have an active enrollment"
    );

    expect(execute).toHaveBeenCalledTimes(2);
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not create an admin or audit event when the claim guard fails", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "enrollment-1",
            role: "support",
            reason: "Support coverage",
            grant_expires_at: futureGrantExpiration(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(admitPlatformAdminSession("user-1")).rejects.toThrow(
      "expired before it could be claimed"
    );

    expect(execute).toHaveBeenCalledTimes(4);
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not write an audit event when the conditional grant insert returns no row", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "enrollment-1",
            role: "support",
            reason: "Support coverage",
            grant_expires_at: futureGrantExpiration(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "enrollment-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "platform-admin-1" }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(admitPlatformAdminSession("user-1")).rejects.toThrow(
      "expired before its grant could be created"
    );

    expect(execute).toHaveBeenCalledTimes(6);
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates the grant and audit event for a successful enrollment claim", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "enrollment-1",
            role: "support",
            reason: "Support coverage",
            grant_expires_at: futureGrantExpiration(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "enrollment-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "platform-admin-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "grant-1" }] });

    await admitPlatformAdminSession("user-1");

    expect(execute).toHaveBeenCalledTimes(6);
    expect(insert).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_admin.enrollment_claimed",
        actorAdminUserId: "user-1",
        actorPlatformAdminId: "platform-admin-1",
        subjectId: "platform-admin-1",
      })
    );
  });

  it("rejects a legacy enrollment with an overlong grant before claiming or writing", async () => {
    execute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          id: "legacy-enrollment",
          role: "support",
          reason: "Legacy support coverage",
          grant_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    await expect(admitPlatformAdminSession("user-1")).rejects.toThrow(
      "support grant expiration exceeds its allowed window"
    );

    expect(execute).toHaveBeenCalledTimes(2);
    expect(insert).not.toHaveBeenCalled();
  });
});
