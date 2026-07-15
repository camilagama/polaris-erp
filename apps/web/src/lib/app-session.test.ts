import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAppContext,
  requireAppContext,
  requirePageAppContext,
} from "@/lib/app-session";

const { dbMock, sessionMock, txMock } = vi.hoisted(() => {
  const txMock = {
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
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

const entitlementMocks = vi.hoisted(() => ({
  getOrganizationProductQuotaStatus: vi.fn(),
}));

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

vi.mock("@/lib/entitlements", () => ({
  getOrganizationProductQuotaStatus:
    entitlementMocks.getOrganizationProductQuotaStatus,
}));

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

const mockUpdateSession = () => {
  const where = vi.fn().mockResolvedValue([]);
  const set = vi.fn().mockReturnValue({ where });
  dbMock.update.mockReturnValueOnce({ set });

  return { set, where };
};

const mockUpdateSessionInTransaction = () => {
  const where = vi.fn().mockResolvedValue([]);
  const set = vi.fn().mockReturnValue({ where });
  txMock.update.mockReturnValueOnce({ set });

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

describe("getAppContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    entitlementMocks.getOrganizationProductQuotaStatus.mockResolvedValue({
      isFree: true,
      isOverRegisteredProductLimit: false,
      maxRegisteredProducts: 50,
      registeredProductCount: 0,
    });
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

  it("redirects suspended organizations to the restricted access page", async () => {
    const navigation = await import("next/navigation");

    mockSession({ activeOrganizationId: "org-suspended" });
    selectAppContextMembershipOnce({
      organizationId: "org-suspended",
      organizationStatus: "suspended",
      role: "owner",
    });

    await requirePageAppContext();

    expect(navigation.redirect).toHaveBeenCalledWith("/restricted-access");
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

  it("rejects a session after its thirty-day absolute lifetime", async () => {
    mockSession({ activeOrganizationId: "org-active" });
    sessionMock.getSession.mockResolvedValueOnce({
      session: {
        activeOrganizationId: "org-active",
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        id: "session-1",
      },
      user: {
        id: "user-1",
      },
    });
    const { set } = mockUpdateSessionInTransaction();
    const values = vi.fn().mockResolvedValue([]);
    txMock.insert.mockReturnValueOnce({ values });

    await expect(getAppContext()).resolves.toBeNull();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: expect.any(Date),
      })
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.session_revoked",
        metadata: {
          reason: "absolute_lifetime_reached",
        },
        subjectId: "session-1",
      })
    );
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

  it("keeps Free tenants above the registered-product limit read-only for sales and stock", async () => {
    mockSession({ activeOrganizationId: "org-active" });
    selectAppContextMembershipOnce({
      organizationId: "org-active",
      organizationStatus: "active",
      role: "owner",
    });
    selectBillingStatusOnce("active");
    entitlementMocks.getOrganizationProductQuotaStatus.mockResolvedValueOnce({
      isFree: true,
      isOverRegisteredProductLimit: true,
      maxRegisteredProducts: 50,
      registeredProductCount: 51,
    });

    await expect(requireAppContext("sales:write")).rejects.toThrow(
      "O plano Free excedeu o limite de produtos cadastrados."
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

  it("keeps onboarding bootstrap implementation outside app-session", () => {
    const source = readFileSync(
      new URL("./app-session.ts", import.meta.url),
      "utf8"
    );

    expect(source).not.toContain("createInitialOrganizationForUser");
    expect(source).not.toContain("ONBOARDING_LOCK_NAMESPACE");
    expect(source).not.toContain("billingPlans");
    expect(source).not.toContain("billingCustomers");
    expect(source).not.toContain("systemSettings");
    expect(source).not.toContain("OTHERS_CATEGORY_KEY");
  });
});
