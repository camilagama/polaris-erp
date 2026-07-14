import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialOrganizationForUser } from "@/features/onboarding/server";

const { dbMock, txMock } = vi.hoisted(() => {
  const txMock = {
    execute: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
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
