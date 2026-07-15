import { createPlatformAdminAuth } from "@polaris/platform-auth/admin-guard";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, sessionMock, withAdminUserContextMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
  },
  sessionMock: {
    getSession: vi.fn(),
  },
  withAdminUserContextMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: dbMock,
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withAdminUserContext: withAdminUserContextMock,
}));

const mockSession = (userId = "user-1") => {
  sessionMock.getSession.mockResolvedValue({
    user: { id: userId },
  });
};

const mockPlatformGrantRows = (
  rows: Array<{
    adminUserId: string;
    platformAdminId: string;
    role: "owner" | "operator" | "support";
  }>
) => {
  const where = vi.fn().mockResolvedValue(rows);
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });

  dbMock.select.mockReturnValueOnce({ from });

  return { from, innerJoin, where };
};

describe("getPlatformAdminContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withAdminUserContextMock.mockImplementation(
      async (_userId: string, callback: (tx: typeof dbMock) => unknown) =>
        callback(dbMock)
    );
  });

  it("does not treat an organization user as a platform admin", async () => {
    mockSession("org-admin-user");
    mockPlatformGrantRows([]);
    const { getPlatformAdminContext } = createPlatformAdminAuth({
      getSession: sessionMock.getSession,
    });

    const context = await getPlatformAdminContext();

    expect(context).toBeNull();
  });

  it("returns the strongest active platform grant for the signed-in user", async () => {
    mockSession("user-founder");
    mockPlatformGrantRows([
      {
        adminUserId: "user-founder",
        platformAdminId: "platform-admin-1",
        role: "support",
      },
      {
        adminUserId: "user-founder",
        platformAdminId: "platform-admin-1",
        role: "owner",
      },
    ]);
    const { getPlatformAdminContext } = createPlatformAdminAuth({
      getSession: sessionMock.getSession,
    });

    const context = await getPlatformAdminContext();

    expect(context).toEqual({
      adminUserId: "user-founder",
      platformAdminId: "platform-admin-1",
      role: "owner",
    });
    expect(withAdminUserContextMock).toHaveBeenCalledWith(
      "user-founder",
      expect.any(Function)
    );
  });

  it("accepts an active DB platform grant after Better Auth session", async () => {
    mockSession("user-founder");
    mockPlatformGrantRows([
      {
        adminUserId: "user-founder",
        platformAdminId: "platform-admin-1",
        role: "operator",
      },
    ]);
    const { requirePlatformAdmin } = createPlatformAdminAuth({
      getSession: sessionMock.getSession,
    });

    await expect(requirePlatformAdmin()).resolves.toEqual({
      adminUserId: "user-founder",
      platformAdminId: "platform-admin-1",
      role: "operator",
    });
  });

  it("rejects a platform admin that lacks the minimum platform role", async () => {
    mockSession("support-user");
    mockPlatformGrantRows([
      {
        adminUserId: "support-user",
        platformAdminId: "platform-admin-2",
        role: "support",
      },
    ]);
    const { requirePlatformAdmin } = createPlatformAdminAuth({
      getSession: sessionMock.getSession,
    });

    await expect(
      requirePlatformAdmin({ minimumRole: "operator" })
    ).rejects.toThrow("Voce nao tem permissao de plataforma suficiente.");
  });
});
