import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialOrganizationForUser } from "@/features/onboarding/server";

const { dbMock, txMock } = vi.hoisted(() => {
  const txMock = {
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  };

  const dbMock = {
    transaction: vi.fn(async (callback) => callback(txMock)),
  };

  return { dbMock, txMock };
});

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: dbMock,
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

const mockInsertValues = () => {
  const values = vi.fn().mockResolvedValue([]);
  txMock.insert.mockReturnValue({ values });

  return values;
};

describe("createInitialOrganizationForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    dbMock.transaction.mockImplementation(async (callback) => callback(txMock));
  });

  it("locks onboarding per user before reading existing membership", async () => {
    selectMembershipOnce("org-existing");

    const onboarding = await createInitialOrganizationForUser({
      organizationName: "Espaço existente",
      userId: "user-1",
    });

    expect(onboarding).toEqual({
      organizationId: "org-existing",
      planId: "polaris-free",
    });
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
      organizationName: "Espaço existente",
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

  it("creates an active Free subscription with the workspace name chosen during onboarding", async () => {
    selectNoMembershipOnce();
    selectDefaultBillingPlanOnce("polaris-free");
    const insertValues = mockInsertValues();

    const onboarding = await createInitialOrganizationForUser({
      billingEmail: "user@example.com",
      organizationName: "Loja da Ana",
      userId: "user-1",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Loja da Ana",
        slug: `tenant-${onboarding.organizationId}`,
      })
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        billingEmail: "user@example.com",
      })
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "polaris-free",
        status: "active",
      })
    );
    expect(onboarding.planId).toBe("polaris-free");
  });

  it("does not require an E2E environment to activate the initial Free subscription", async () => {
    selectNoMembershipOnce();
    selectDefaultBillingPlanOnce("polaris-free");
    const insertValues = mockInsertValues();

    await createInitialOrganizationForUser({
      organizationName: "Loja da Ana",
      userId: "user-1",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "polaris-free",
        status: "active",
      })
    );
  });

  it("claims an exact-email paid checkout and creates a paid subscription", async () => {
    selectNoMembershipOnce();
    selectDefaultBillingPlanOnce("polaris-paid-monthly");
    const insertValues = mockInsertValues();
    const where = vi.fn().mockResolvedValue([]);
    const set = vi.fn().mockReturnValue({ where });
    txMock.update = vi.fn().mockReturnValue({ set });
    txMock.execute
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "signup-intent-1",
            provider: "asaas",
            providerSubscriptionId: "sub_123",
          },
        ],
      });

    const onboarding = await createInitialOrganizationForUser({
      billingEmail: "  OWNER@EXAMPLE.COM ",
      organizationName: "Loja paga",
      userId: "user-1",
    });

    expect(onboarding.planId).toBe("polaris-paid-monthly");
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "polaris-paid-monthly",
        status: "active",
      })
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        billingSubscriptionId: expect.any(String),
        externalId: "sub_123",
        provider: "asaas",
      })
    );
    expect(txMock.update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        claimedOrganizationId: onboarding.organizationId,
        claimedUserId: "user-1",
        claimedAt: expect.any(Date),
      })
    );
  });

  it("fails onboarding when no active billing plan exists", async () => {
    selectNoMembershipOnce();
    selectDefaultBillingPlanOnce(null);

    await expect(
      createInitialOrganizationForUser({
        organizationName: "Loja da Ana",
        userId: "user-1",
      })
    ).rejects.toThrow("Plano de billing ativo nao encontrado.");
  });
});
