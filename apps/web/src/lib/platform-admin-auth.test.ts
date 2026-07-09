import { createPlatformAdminAuth } from "@polaris/platform-auth/admin-guard";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { accessMock, dbMock, sessionMock } = vi.hoisted(() => ({
  accessMock: {
    verifyCloudflareAccess: vi.fn(),
  },
  dbMock: {
    select: vi.fn(),
  },
  sessionMock: {
    getSession: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: dbMock,
}));

vi.mock("@polaris/platform-auth/cloudflare-access", () => ({
  verifyCloudflareAccess: accessMock.verifyCloudflareAccess,
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
    accessMock.verifyCloudflareAccess.mockResolvedValue({
      email: "founder@example.com",
      subject: "access-user-1",
    });
  });

  it("does not treat an organization user as a platform admin", async () => {
    mockSession("org-admin-user");
    mockPlatformGrantRows([]);
    const { getPlatformAdminContext } = createPlatformAdminAuth({
      getSession: sessionMock.getSession,
    });

    const context = await getPlatformAdminContext({
      requireAccess: false,
    });

    expect(context).toBeNull();
    expect(accessMock.verifyCloudflareAccess).not.toHaveBeenCalled();
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

    const context = await getPlatformAdminContext({
      requireAccess: false,
    });

    expect(context).toEqual({
      access: null,
      platformAdminId: "platform-admin-1",
      role: "owner",
      userId: "user-founder",
    });
  });

  it("requires Cloudflare Access before accepting a DB platform grant", async () => {
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

    await requirePlatformAdmin();

    expect(accessMock.verifyCloudflareAccess).toHaveBeenCalledOnce();
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
      requirePlatformAdmin({ minimumRole: "operator", requireAccess: false })
    ).rejects.toThrow("Voce nao tem permissao de plataforma suficiente.");
  });
});
