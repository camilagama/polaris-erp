import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInitialOrganizationForUser,
  getAppContext,
  requireAppContext,
  requirePageAppContext,
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

vi.mock("@polaris/db", () => ({
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

const selectNoMembershipOnce = () => {
  txMock.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  });
};

const selectDefaultBillingPlanOnce = (planId: string | null) => {
  txMock.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(planId ? [{ id: planId }] : []),
        }),
      }),
    }),
  });
};

const selectAppContextMembershipOnce = (
  membership: {
    organizationId: string;
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

const selectBillingStatusOnce = (status: string | null) => {
  txMock.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(status ? [{ status }] : []),
        }),
      }),
    }),
  });
};

const mockInsertValues = () => {
  const values = vi.fn().mockResolvedValue([]);
  txMock.insert.mockReturnValue({ values });

  return values;
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
    vi.unstubAllEnvs();
    dbMock.transaction.mockImplementation(async (callback) => callback(txMock));
  });

  it("locks onboarding per user before reading existing membership", async () => {
    selectMembershipOnce("org-existing");

    const organizationId = await createInitialOrganizationForUser({
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

  it("creates an incomplete subscription with a server-side technical tenant identity during onboarding", async () => {
    selectNoMembershipOnce();
    selectDefaultBillingPlanOnce("polaris-start-monthly");
    const insertValues = mockInsertValues();

    const organizationId = await createInitialOrganizationForUser({
      billingEmail: "user@example.com",
      userId: "user-1",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: `Tenant ${organizationId.slice(0, 8)}`,
        slug: `tenant-${organizationId}`,
      })
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        billingEmail: "user@example.com",
      })
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "polaris-start-monthly",
        status: "incomplete",
      })
    );
  });

  it("activates the initial subscription only for isolated local E2E bootstrap", async () => {
    const isolatedDatabaseUrl = "postgres://e2e:e2e@example.com/e2e";

    vi.stubEnv("ALLOW_PLAYWRIGHT_BOOTSTRAP", "true");
    vi.stubEnv("DATABASE_URL", isolatedDatabaseUrl);
    vi.stubEnv("E2E_DATABASE_URL", isolatedDatabaseUrl);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "development");
    selectNoMembershipOnce();
    selectDefaultBillingPlanOnce("polaris-start-monthly");
    const insertValues = mockInsertValues();

    await createInitialOrganizationForUser({
      userId: "user-1",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "polaris-start-monthly",
        status: "active",
      })
    );
  });

  it("fails onboarding when no active billing plan exists", async () => {
    selectNoMembershipOnce();
    selectDefaultBillingPlanOnce(null);

    await expect(
      createInitialOrganizationForUser({
        userId: "user-1",
      })
    ).rejects.toThrow("Plano de billing ativo nao encontrado.");
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
      organizationStatus: "active",
      role: "owner",
    });
    selectBillingStatusOnce("active");
    const { set } = mockUpdateSession();

    const context = await getAppContext();

    expect(context).toEqual({
      billingStatus: "active",
      hasBillableAccess: true,
      organizationId: "org-active",
      role: "owner",
      userId: "user-1",
    });
    expect(dbMock.transaction).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        activeOrganizationId: "org-active",
      })
    );
  });

  it("returns active organization context without billable access for incomplete subscriptions", async () => {
    mockSession({ activeOrganizationId: "org-active" });
    selectAppContextMembershipOnce({
      organizationId: "org-active",
      organizationStatus: "active",
      role: "owner",
    });
    selectBillingStatusOnce("incomplete");

    const context = await getAppContext();

    expect(context).toEqual({
      billingStatus: "incomplete",
      hasBillableAccess: false,
      organizationId: "org-active",
      role: "owner",
      userId: "user-1",
    });
  });

  it.each([
    "trialing",
    "past_due",
  ] as const)("returns active organization context without billable access for %s subscriptions", async (billingStatus) => {
    mockSession({ activeOrganizationId: "org-active" });
    selectAppContextMembershipOnce({
      organizationId: "org-active",
      organizationStatus: "active",
      role: "owner",
    });
    selectBillingStatusOnce(billingStatus);

    const context = await getAppContext();

    expect(context).toEqual({
      billingStatus,
      hasBillableAccess: false,
      organizationId: "org-active",
      role: "owner",
      userId: "user-1",
    });
  });

  it("blocks operational app actions without a billable subscription", async () => {
    mockSession({ activeOrganizationId: "org-active" });
    selectAppContextMembershipOnce({
      organizationId: "org-active",
      organizationStatus: "active",
      role: "owner",
    });
    selectBillingStatusOnce("incomplete");

    await expect(requireAppContext("catalog:read")).rejects.toThrow(
      "Assinatura ativa necessaria para acessar o Polaris."
    );
  });

  it("redirects app pages without a billable subscription to the billing block page", async () => {
    const navigation = await import("next/navigation");

    mockSession({ activeOrganizationId: "org-active" });
    selectAppContextMembershipOnce({
      organizationId: "org-active",
      organizationStatus: "active",
      role: "owner",
    });
    selectBillingStatusOnce("incomplete");

    await requirePageAppContext();

    expect(navigation.redirect).toHaveBeenCalledWith("/billing-required");
  });
});
