import { createPlatformAdminAuth } from "@polaris/platform-auth/admin-guard";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, sessionMock, withUserContextMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
  },
  sessionMock: {
    getSession: vi.fn(),
  },
  withUserContextMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: dbMock,
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withUserContext: withUserContextMock,
}));

const mockSession = (userId = "user-1") => {
  sessionMock.getSession.mockResolvedValue({
    user: { id: userId },
  });
};

const mockPlatformGrantRows = (
  rows: Array<{
    platformAdminId: string;
    role: "owner" | "operator" | "support";
    userId: string;
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
    withUserContextMock.mockImplementation(
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
        platformAdminId: "platform-admin-1",
        role: "support",
        userId: "user-founder",
      },
      {
        platformAdminId: "platform-admin-1",
        role: "owner",
        userId: "user-founder",
      },
    ]);
    const { getPlatformAdminContext } = createPlatformAdminAuth({
      getSession: sessionMock.getSession,
    });

    const context = await getPlatformAdminContext();

    expect(context).toEqual({
      platformAdminId: "platform-admin-1",
      role: "owner",
      userId: "user-founder",
    });
    expect(withUserContextMock).toHaveBeenCalledWith(
      "user-founder",
      expect.any(Function)
    );
  });

  it("accepts an active DB platform grant after Better Auth session", async () => {
    mockSession("user-founder");
    mockPlatformGrantRows([
      {
        platformAdminId: "platform-admin-1",
        role: "operator",
        userId: "user-founder",
      },
    ]);
    const { requirePlatformAdmin } = createPlatformAdminAuth({
      getSession: sessionMock.getSession,
    });

    await expect(requirePlatformAdmin()).resolves.toEqual({
      platformAdminId: "platform-admin-1",
      role: "operator",
      userId: "user-founder",
    });
  });

  it("rejects a platform admin that lacks the minimum platform role", async () => {
    mockSession("support-user");
    mockPlatformGrantRows([
      {
        platformAdminId: "platform-admin-2",
        role: "support",
        userId: "support-user",
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
