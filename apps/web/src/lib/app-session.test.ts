import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInitialOrganizationForUser,
  getAppContext,
} from "@/lib/app-session";

const { dbMock, sessionMock, txMock } = vi.hoisted(() => {
  const txMock = {
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  };

  const dbMock = {
    select: vi.fn(),
    transaction: vi.fn(async (callback) => callback(txMock)),
    update: vi.fn(),
  };

  const sessionMock = {
    getSession: vi.fn(),
  };

  return { dbMock, sessionMock, txMock };
});

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/session", () => ({
  getSession: sessionMock.getSession,
}));

const selectMembershipOnce = (organizationId: string) => {
  txMock.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ organizationId }]),
        }),
      }),
    }),
  });
};

const selectAppContextMembershipOnce = (
  membership: {
    organizationId: string;
    organizationName: string;
    organizationStatus: string;
    role: string;
  } | null
) => {
  txMock.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(membership ? [membership] : []),
          }),
        }),
      }),
    }),
  });
};

const mockUpdateSession = () => {
  const where = vi.fn().mockResolvedValue([]);
  const set = vi.fn().mockReturnValue({ where });
  dbMock.update.mockReturnValueOnce({ set });

  return { set, where };
};

const mockSession = ({
  activeOrganizationId = null,
  sessionId = "session-1",
  userId = "user-1",
}: {
  activeOrganizationId?: string | null;
  sessionId?: string;
  userId?: string;
} = {}) => {
  sessionMock.getSession.mockResolvedValue({
    session: {
      activeOrganizationId,
      id: sessionId,
    },
    user: {
      id: userId,
    },
  });
};

describe("createInitialOrganizationForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.transaction.mockImplementation(async (callback) => callback(txMock));
  });

  it("locks onboarding per user before reading existing membership", async () => {
    selectMembershipOnce("org-existing");

    const organizationId = await createInitialOrganizationForUser({
      name: "Polaris Brasil",
      userId: "user-1",
    });

    expect(organizationId).toBe("org-existing");
    expect(txMock.execute.mock.invocationCallOrder[0]).toBeLessThan(
      txMock.select.mock.invocationCallOrder[0]
    );
    expect(txMock.execute.mock.invocationCallOrder[1]).toBeLessThan(
      txMock.select.mock.invocationCallOrder[0]
    );
  });

  it("sets user context before reading existing onboarding membership", async () => {
    selectMembershipOnce("org-existing");

    await createInitialOrganizationForUser({
      name: "Polaris Brasil",
      userId: "user-1",
    });

    const userContextCallIndex = txMock.execute.mock.calls.findIndex((call) =>
      JSON.stringify(call[0]).includes("app.user_id")
    );

    expect(userContextCallIndex).toBeGreaterThanOrEqual(0);
    expect(
      txMock.execute.mock.invocationCallOrder[userContextCallIndex]
    ).toBeLessThan(txMock.select.mock.invocationCallOrder[0]);
  });
});

describe("getAppContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for inactive organizations without updating the active session organization", async () => {
    mockSession({ activeOrganizationId: "org-inactive" });
    selectAppContextMembershipOnce({
      organizationId: "org-inactive",
      organizationName: "Polaris Pausado",
      organizationStatus: "inactive",
      role: "owner",
    });

    const context = await getAppContext();

    expect(context).toBeNull();
    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it("returns null when the session active organization is not a user membership", async () => {
    mockSession({ activeOrganizationId: "org-spoofed" });
    selectAppContextMembershipOnce(null);

    const context = await getAppContext();

    expect(context).toBeNull();
    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it("updates the session active organization when resolving the first active membership", async () => {
    mockSession();
    selectAppContextMembershipOnce({
      organizationId: "org-active",
      organizationName: "Polaris",
      organizationStatus: "active",
      role: "owner",
    });
    const { set } = mockUpdateSession();

    const context = await getAppContext();

    expect(context).toEqual({
      organizationId: "org-active",
      organizationName: "Polaris",
      role: "owner",
      userId: "user-1",
    });
    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        activeOrganizationId: "org-active",
      })
    );
  });
});
